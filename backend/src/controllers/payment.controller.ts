import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { InvoiceStatus } from '@prisma/client';

const recordPaymentSchema = z.object({
  companyId: z.string().min(1, 'Customer company is required'),
  invoiceId: z.string().optional().nullable(),
  amount: z.number().min(1, 'Payment amount must be greater than zero'),
  paymentDate: z.string().optional(),
  paymentMode: z.string().default('NEFT/RTGS'),
  referenceNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// GET /api/payments - List all payments with optional filtering
export async function getPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { companyId, invoiceId, search } = req.query;
    const where: any = {};

    if (companyId && typeof companyId === 'string') {
      where.companyId = companyId;
    }

    if (invoiceId && typeof invoiceId === 'string') {
      where.invoiceId = invoiceId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { paymentMode: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, gstin: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, totalAmount: true, balanceDue: true, status: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    // Summary calculations
    const [totalAggregate, thisMonthAggregate] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.status(200).json({
      payments,
      summary: {
        totalCollected: Number(totalAggregate._sum.amount || 0),
        totalTransactions: totalAggregate._count.id,
        thisMonthCollected: Number(thisMonthAggregate._sum.amount || 0),
      },
    });
  } catch (error: any) {
    console.error('getPayments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
}

// POST /api/payments - Record customer payment & atomically update invoice balance
export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = recordPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { companyId, invoiceId, amount, paymentDate, paymentMode, referenceNo, remarks } =
      validation.data;

    // Verify company
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Customer company not found' });
      return;
    }

    let invoice: any = null;
    if (invoiceId) {
      invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        res.status(404).json({ error: 'Referenced invoice not found' });
        return;
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        res.status(400).json({ error: 'Cannot record payments against a cancelled invoice' });
        return;
      }
    }

    // Atomic transaction: create payment, update invoice status & balance, write audit log
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          companyId,
          invoiceId: invoiceId || null,
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode,
          referenceNo: referenceNo || null,
          remarks: remarks || null,
        },
        include: {
          company: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });

      let updatedInvoice: any = null;
      if (invoiceId && invoice) {
        const curPaid = Number(invoice.paidAmount);
        const total = Number(invoice.totalAmount);
        const newPaid = Math.round((curPaid + amount) * 100) / 100;
        const newBalance = Math.round((total - newPaid) * 100) / 100;

        let newStatus: InvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
        if (newBalance <= 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaid === 0) {
          newStatus = InvoiceStatus.UNPAID;
        }

        updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaid,
            balanceDue: Math.max(0, newBalance),
            status: newStatus,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: payment.id,
          action: 'CREATE',
          changedBy: req.user?.username || 'admin',
          newValues: {
            amount,
            companyName: company.name,
            invoiceNumber: invoice ? invoice.invoiceNumber : 'On-Account',
            paymentMode,
            referenceNo: referenceNo || null,
          },
        },
      });

      return { payment, updatedInvoice };
    });

    res.status(201).json({
      message: `Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully`,
      payment: result.payment,
      updatedInvoice: result.updatedInvoice,
    });
  } catch (error: any) {
    console.error('recordPayment error:', error);
    res.status(500).json({ error: error?.message || 'Failed to record payment' });
  }
}

// DELETE /api/payments/:id - Reverse/Delete payment and restore invoice balance
export async function deletePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true, company: true },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Revert invoice balances if payment was linked to an invoice
      if (payment.invoiceId && payment.invoice) {
        const amountReversed = Number(payment.amount);
        const curPaid = Number(payment.invoice.paidAmount);
        const total = Number(payment.invoice.totalAmount);
        const newPaid = Math.max(0, Math.round((curPaid - amountReversed) * 100) / 100);
        const newBalance = Math.round((total - newPaid) * 100) / 100;

        let newStatus: InvoiceStatus = InvoiceStatus.UNPAID;
        if (newPaid > 0 && newBalance > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        } else if (newBalance <= 0) {
          newStatus = InvoiceStatus.PAID;
        }

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: newStatus,
          },
        });
      }

      // Delete payment
      await tx.payment.delete({ where: { id } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: id,
          action: 'DELETE',
          changedBy: req.user?.username || 'admin',
          reason: 'Payment reversal',
          oldValues: {
            amount: Number(payment.amount),
            companyName: payment.company.name,
            invoiceNumber: payment.invoice?.invoiceNumber || 'On-Account',
          },
        },
      });
    });

    res.status(200).json({ message: 'Payment reversed successfully and invoice balance restored' });
  } catch (error: any) {
    console.error('deletePayment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
}

// PUT /api/payments/:id - Update existing payment
export async function updatePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true, company: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    const validation = recordPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { companyId, invoiceId, amount, paymentDate, paymentMode, referenceNo, remarks } =
      validation.data;

    await prisma.$transaction(async (tx) => {
      // If invoice was linked, first reverse old payment amount
      if (existing.invoiceId && existing.invoice) {
        const curPaid = Number(existing.invoice.paidAmount);
        const total = Number(existing.invoice.totalAmount);
        const rolledBackPaid = Math.max(0, curPaid - Number(existing.amount));
        const rolledBackBalance = Math.round((total - rolledBackPaid) * 100) / 100;
        await tx.invoice.update({
          where: { id: existing.invoiceId },
          data: {
            paidAmount: rolledBackPaid,
            balanceDue: rolledBackBalance,
            status: rolledBackPaid === 0 ? InvoiceStatus.UNPAID : InvoiceStatus.PARTIALLY_PAID,
          },
        });
      }

      // If new or same invoiceId is provided, apply new payment amount
      if (invoiceId) {
        const targetInvoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (targetInvoice) {
          const curPaid = Number(targetInvoice.paidAmount);
          const total = Number(targetInvoice.totalAmount);
          const newPaid = Math.round((curPaid + amount) * 100) / 100;
          const newBalance = Math.round((total - newPaid) * 100) / 100;

          let newStatus: InvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
          if (newBalance <= 0) {
            newStatus = InvoiceStatus.PAID;
          } else if (newPaid === 0) {
            newStatus = InvoiceStatus.UNPAID;
          }

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: Math.max(0, newBalance),
              status: newStatus,
            },
          });
        }
      }

      // Update the payment record
      await tx.payment.update({
        where: { id },
        data: {
          companyId,
          invoiceId: invoiceId || null,
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate,
          paymentMode,
          referenceNo: referenceNo || null,
          remarks: remarks || null,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: id,
          action: 'UPDATE',
          changedBy: req.user?.username || 'admin',
          newValues: {
            amount,
            paymentMode,
            referenceNo,
          },
        },
      });
    });

    res.status(200).json({ message: 'Payment record updated successfully' });
  } catch (error: any) {
    console.error('updatePayment error:', error);
    res.status(500).json({ error: error?.message || 'Failed to update payment' });
  }
}

