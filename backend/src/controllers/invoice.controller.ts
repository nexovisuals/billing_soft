import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { InvoiceStatus, DCStatus } from '@prisma/client';
import { numberToIndianWords } from '../utils/numberToWords.js';

// Helper to determine Indian Financial Year (e.g., 2026-27)
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0 to 11
  const year = date.getFullYear();
  if (month >= 3) { // April onwards
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    const prevYear = year - 1;
    const curYearShort = year.toString().slice(-2);
    return `${prevYear}-${curYearShort}`;
  }
}

// Helper: Get next invoice number for the current FY
export async function getNextInvoiceNumber(): Promise<string> {
  const currentFy = getFinancialYear();
  
  // Find invoices ending with this FY
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: {
        endsWith: `/${currentFy}`,
      },
    },
    select: { invoiceNumber: true },
    orderBy: { createdAt: 'desc' },
  });

  if (invoices.length === 0) {
    // Check if any invoice exists at all
    const totalCount = await prisma.invoice.count();
    if (totalCount === 0) {
      // Starting sample number matching physical reference bill #069/2026-27
      return `069/${currentFy}`;
    }
    return `001/${currentFy}`;
  }

  // Extract numerical prefixes
  let maxNum = 0;
  for (const inv of invoices) {
    const parts = inv.invoiceNumber.split('/');
    if (parts.length > 0) {
      const num = parseInt(parts[0], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(3, '0');
  return `${padded}/${currentFy}`;
}

const invoiceItemSchema = z.object({
  materialId: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  hsnSacCode: z.string().default('998898'),
  partNumber: z.string().optional().nullable(),
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
  rate: z.number().min(0, 'Rate cannot be negative'),
  uom: z.string().default('nos'),
  gstRate: z.number().default(18.0),
});

const createInvoiceSchema = z.object({
  companyId: z.string().min(1, 'Customer company is required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  billingMonth: z.string().optional().nullable(),
  buyersOrderNo: z.string().optional().nullable(),
  buyersOrderDate: z.string().optional().nullable(),
  challanIds: z.array(z.string()).optional().default([]),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
  remarks: z.string().optional().nullable(),
});

// GET /api/invoices/next-number
export async function getNextNumber(req: AuthRequest, res: Response): Promise<void> {
  try {
    const nextInvoiceNumber = await getNextInvoiceNumber();
    res.status(200).json({ nextInvoiceNumber });
  } catch (error: any) {
    console.error('getNextNumber error:', error);
    res.status(500).json({ error: 'Failed to generate next invoice number' });
  }
}

// GET /api/invoices/pending-dcs?companyId=...
export async function getPendingDCs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      res.status(400).json({ error: 'companyId query parameter is required' });
      return;
    }

    const pendingDCs = await prisma.deliveryChallan.findMany({
      where: {
        companyId,
        status: DCStatus.PENDING_INVOICING,
      },
      include: {
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { dcDate: 'asc' },
    });

    res.status(200).json({ pendingDCs });
  } catch (error: any) {
    console.error('getPendingDCs error:', error);
    res.status(500).json({ error: 'Failed to fetch pending delivery challans' });
  }
}

// GET /api/invoices
export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, companyId, search } = req.query;
    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as InvoiceStatus;
    }

    if (companyId && typeof companyId === 'string') {
      where.companyId = companyId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { buyersOrderNo: { contains: search, mode: 'insensitive' } },
        { dispatchChallanRef: { contains: search, mode: 'insensitive' } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            gstin: true,
            phoneNumber: true,
            address: true,
          },
        },
        _count: {
          select: { items: true, challans: true, payments: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Calculate aggregated metrics
    const [totalCount, unpaidCount, totalInvoiced] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] } } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
        where: { status: { not: InvoiceStatus.CANCELLED } },
      }),
    ]);

    res.status(200).json({
      invoices,
      metrics: {
        totalInvoices: totalCount,
        unpaidInvoices: unpaidCount,
        totalInvoicedAmount: Number(totalInvoiced._sum.totalAmount || 0),
        totalCollectedAmount: Number(totalInvoiced._sum.paidAmount || 0),
        totalOutstandingDue: Number(totalInvoiced._sum.balanceDue || 0),
      },
    });
  } catch (error: any) {
    console.error('getInvoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

// GET /api/invoices/:id
export async function getInvoiceById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        items: {
          include: {
            material: true,
          },
        },
        challans: {
          include: {
            items: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const totalAmountNum = Number(invoice.totalAmount);
    const totalTaxNum = Number(invoice.cgstAmount) + Number(invoice.sgstAmount) + Number(invoice.igstAmount);

    const amountInWords = numberToIndianWords(totalAmountNum);
    const taxInWords = numberToIndianWords(totalTaxNum);

    res.status(200).json({
      invoice,
      amountInWords,
      taxInWords,
    });
  } catch (error: any) {
    console.error('getInvoiceById error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
}

// POST /api/invoices
export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = createInvoiceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const {
      companyId,
      invoiceNumber: customInvoiceNumber,
      invoiceDate,
      billingMonth,
      buyersOrderNo,
      buyersOrderDate,
      challanIds,
      items,
      remarks,
    } = validation.data;

    // Check company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      res.status(404).json({ error: 'Selected customer company not found' });
      return;
    }

    // Determine invoice number
    let finalInvoiceNumber = customInvoiceNumber;
    if (!finalInvoiceNumber) {
      finalInvoiceNumber = await getNextInvoiceNumber();
    } else {
      const existing = await prisma.invoice.findUnique({
        where: { invoiceNumber: finalInvoiceNumber },
      });
      if (existing) {
        res.status(400).json({ error: `Invoice number ${finalInvoiceNumber} is already in use` });
        return;
      }
    }

    // Calculate line amounts
    let taxableValue = 0;
    const computedItems = items.map((item) => {
      const lineAmount = Math.round(item.quantity * item.rate * 100) / 100;
      taxableValue += lineAmount;
      return {
        materialId: item.materialId || null,
        description: item.description,
        hsnSacCode: item.hsnSacCode || '998898',
        partNumber: item.partNumber || null,
        quantity: item.quantity,
        rate: item.rate,
        uom: item.uom || 'nos',
        gstRate: item.gstRate || 18.0,
        amount: lineAmount,
      };
    });

    taxableValue = Math.round(taxableValue * 100) / 100;

    // Intra-state vs Inter-state
    // Tamil Nadu GSTIN starts with '33'
    const isIntraState = !company.gstin || company.gstin.startsWith('33');

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isIntraState) {
      cgstRate = 9.0;
      sgstRate = 9.0;
      cgstAmount = Math.round(taxableValue * 0.09 * 100) / 100;
      sgstAmount = Math.round(taxableValue * 0.09 * 100) / 100;
    } else {
      igstRate = 18.0;
      igstAmount = Math.round(taxableValue * 0.18 * 100) / 100;
    }

    const preRoundTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
    const totalAmount = Math.round(preRoundTotal);
    const roundOff = Math.round((totalAmount - preRoundTotal) * 100) / 100;

    // Check delivery challans if provided
    let challanRefString = '';
    let selectedChallans: any[] = [];
    if (challanIds && challanIds.length > 0) {
      selectedChallans = await prisma.deliveryChallan.findMany({
        where: {
          id: { in: challanIds },
          companyId,
          status: DCStatus.PENDING_INVOICING,
        },
      });

      if (selectedChallans.length !== challanIds.length) {
        res.status(400).json({
          error: 'One or more selected Delivery Challans are invalid or already invoiced',
        });
        return;
      }

      challanRefString = selectedChallans
        .map((dc) => {
          const dateStr = new Date(dc.dcDate).toLocaleDateString('en-GB');
          return `SVT DC: ${dc.dcNumber} / ${dateStr}`;
        })
        .join(', ');
    }

    // Database transaction: create invoice, link challans, create audit log
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: finalInvoiceNumber!,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          billingMonth: billingMonth || null,
          companyId,
          buyersOrderNo: buyersOrderNo || null,
          buyersOrderDate: buyersOrderDate ? new Date(buyersOrderDate) : null,
          dispatchChallanRef: challanRefString || null,
          taxableValue,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          roundOff,
          totalAmount,
          paidAmount: 0,
          balanceDue: totalAmount,
          status: InvoiceStatus.UNPAID,
          remarks: remarks || null,
          items: {
            create: computedItems,
          },
        },
        include: {
          items: true,
          company: true,
        },
      });

      // Update linked Delivery Challans to INVOICED
      if (challanIds && challanIds.length > 0) {
        await tx.deliveryChallan.updateMany({
          where: { id: { in: challanIds } },
          data: {
            status: DCStatus.INVOICED,
            invoiceId: created.id,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'INVOICE',
          entityId: created.id,
          action: 'CREATE',
          changedBy: req.user?.username || 'admin',
          newValues: {
            invoiceNumber: created.invoiceNumber,
            totalAmount: Number(created.totalAmount),
            companyName: company.name,
            challansCount: challanIds?.length || 0,
          },
        },
      });

      return created;
    });

    const amountInWords = numberToIndianWords(totalAmount);

    res.status(201).json({
      message: `Tax Invoice ${invoice.invoiceNumber} created successfully`,
      invoice,
      amountInWords,
    });
  } catch (error: any) {
    console.error('createInvoice error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create invoice' });
  }
}

// PUT /api/invoices/:id/cancel
export async function cancelInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true, challans: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      res.status(400).json({ error: 'This invoice is already cancelled' });
      return;
    }

    if (Number(invoice.paidAmount) > 0 || invoice.payments.length > 0) {
      res.status(400).json({
        error: 'Cannot cancel invoice with recorded customer payments. Reverse payments first.',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Revert Delivery Challans back to PENDING_INVOICING
      await tx.deliveryChallan.updateMany({
        where: { invoiceId: id },
        data: {
          status: DCStatus.PENDING_INVOICING,
          invoiceId: null,
        },
      });

      // Mark invoice as CANCELLED
      await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          remarks: invoice.remarks ? `${invoice.remarks} | CANCELLED: ${reason || 'N/A'}` : `CANCELLED: ${reason || 'N/A'}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'INVOICE',
          entityId: id,
          action: 'CANCEL',
          changedBy: req.user?.username || 'admin',
          reason: reason || 'Not specified',
          newValues: {
            invoiceNumber: invoice.invoiceNumber,
            status: 'CANCELLED',
          },
        },
      });
    });

    res.status(200).json({
      message: `Invoice ${invoice.invoiceNumber} cancelled successfully and linked DCs returned to pending status`,
    });
  } catch (error: any) {
    console.error('cancelInvoice error:', error);
    res.status(500).json({ error: 'Failed to cancel invoice' });
  }
}

// DELETE /api/invoices/:id - Permanently Delete Tax Invoice
export async function deleteInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true, challans: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Revert linked DCs to PENDING_INVOICING
      await tx.deliveryChallan.updateMany({
        where: { invoiceId: id },
        data: {
          status: DCStatus.PENDING_INVOICING,
          invoiceId: null,
        },
      });

      // Detach payments if any
      await tx.payment.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null },
      });

      // Delete items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      // Delete invoice
      await tx.invoice.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          entityType: 'INVOICE',
          entityId: id,
          action: 'DELETE',
          changedBy: req.user?.username || 'admin',
          reason: 'Admin deleted invoice',
          oldValues: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: Number(invoice.totalAmount),
          },
        },
      });
    });

    res.status(200).json({
      message: `Invoice ${invoice.invoiceNumber} deleted and linked challans reset to pending`,
    });
  } catch (error: any) {
    console.error('deleteInvoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
}

// PUT /api/invoices/:id - Edit Tax Invoice
export async function updateInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, company: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const {
      invoiceDate,
      buyersOrderNo,
      buyersOrderDate,
      remarks,
      items,
    } = req.body;

    let taxableValue = Number(invoice.taxableValue);
    let cgstAmount = Number(invoice.cgstAmount);
    let sgstAmount = Number(invoice.sgstAmount);
    let igstAmount = Number(invoice.igstAmount);
    let totalAmount = Number(invoice.totalAmount);
    let balanceDue = Number(invoice.balanceDue);
    const isInterState = Number(invoice.igstAmount) > 0;

    // If new line items provided, recalculate
    if (items && Array.isArray(items) && items.length > 0) {
      taxableValue = 0;
      let calculatedCgst = 0;
      let calculatedSgst = 0;
      let calculatedIgst = 0;

      for (const it of items) {
        const itemTaxable = Math.round(Number(it.quantity) * Number(it.rate) * 100) / 100;
        taxableValue += itemTaxable;

        const rateGst = Number(it.gstRate || 18.0);
        const itemTax = Math.round(((itemTaxable * rateGst) / 100) * 100) / 100;

        if (isInterState) {
          calculatedIgst += itemTax;
        } else {
          calculatedCgst += Math.round((itemTax / 2) * 100) / 100;
          calculatedSgst += Math.round((itemTax / 2) * 100) / 100;
        }
      }

      cgstAmount = calculatedCgst;
      sgstAmount = calculatedSgst;
      igstAmount = calculatedIgst;
      const totalTax = isInterState ? calculatedIgst : calculatedCgst + calculatedSgst;
      const rawTotal = taxableValue + totalTax;
      totalAmount = Math.round(rawTotal);
      const paid = Number(invoice.paidAmount);
      balanceDue = Math.max(0, totalAmount - paid);

      // Re-create items
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      for (const it of items) {
        const itemTaxable = Math.round(Number(it.quantity) * Number(it.rate) * 100) / 100;
        await prisma.invoiceItem.create({
          data: {
            invoiceId: id,
            materialId: it.materialId || null,
            description: it.description,
            hsnSacCode: it.hsnSacCode || '998898',
            partNumber: it.partNumber || null,
            quantity: Number(it.quantity),
            uom: it.uom || 'nos',
            rate: Number(it.rate),
            gstRate: Number(it.gstRate || 18.0),
            amount: itemTaxable,
          },
        });
      }
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : invoice.invoiceDate,
        buyersOrderNo: buyersOrderNo !== undefined ? buyersOrderNo : invoice.buyersOrderNo,
        buyersOrderDate: buyersOrderDate ? new Date(buyersOrderDate) : invoice.buyersOrderDate,
        remarks: remarks !== undefined ? remarks : invoice.remarks,
        taxableValue,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        balanceDue,
      },
    });

    res.status(200).json({
      message: 'Tax invoice updated successfully',
      invoice: updated,
    });
  } catch (error: any) {
    console.error('updateInvoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
}
