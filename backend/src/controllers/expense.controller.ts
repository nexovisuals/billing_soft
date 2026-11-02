import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// Schemas
const purchaseSchema = z.object({
  supplierName: z.string().optional().nullable(),
  itemName: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  uom: z.string().default('pcs'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  totalAmount: z.number().optional(),
  supplierBillNo: z.string().optional().nullable(),
  paymentStatus: z.string().default('PAID'),
  purchaseDate: z.string().optional(),
  remarks: z.string().optional().nullable(),
});

const otherExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  expenseDate: z.string().optional(),
  paymentMode: z.string().optional().nullable(),
  referenceNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// GET /api/expenses/purchases
export async function getPurchases(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, search } = req.query;
    const where: any = {};

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
        { supplierBillNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { purchaseDate: 'desc' },
    });

    const totalAgg = await prisma.purchase.aggregate({
      _sum: { totalAmount: true },
    });

    res.status(200).json({
      purchases,
      totalAmount: Number(totalAgg._sum.totalAmount || 0),
    });
  } catch (error: any) {
    console.error('getPurchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
}

// POST /api/expenses/purchases
export async function createPurchase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = purchaseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const {
      supplierName,
      itemName,
      category,
      quantity,
      uom,
      unitPrice,
      totalAmount,
      supplierBillNo,
      paymentStatus,
      purchaseDate,
      remarks,
    } = validation.data;

    const computedTotal = totalAmount || Math.round(quantity * unitPrice * 100) / 100;

    const purchase = await prisma.purchase.create({
      data: {
        supplierName: supplierName || null,
        itemName,
        category,
        quantity,
        uom: uom || 'pcs',
        unitPrice,
        totalAmount: computedTotal,
        supplierBillNo: supplierBillNo || null,
        paymentStatus: paymentStatus || 'PAID',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        remarks: remarks || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'PURCHASE',
        entityId: purchase.id,
        action: 'CREATE',
        changedBy: req.user?.username || 'admin',
        newValues: {
          itemName,
          totalAmount: computedTotal,
          category,
          supplierName,
        },
      },
    });

    res.status(201).json({
      message: `Purchase of ${itemName} recorded successfully`,
      purchase,
    });
  } catch (error: any) {
    console.error('createPurchase error:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
}

// DELETE /api/expenses/purchases/:id
export async function deletePurchase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) {
      res.status(404).json({ error: 'Purchase record not found' });
      return;
    }

    await prisma.purchase.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: 'PURCHASE',
        entityId: id,
        action: 'DELETE',
        changedBy: req.user?.username || 'admin',
        reason: 'Manual deletion',
        oldValues: {
          itemName: purchase.itemName,
          totalAmount: Number(purchase.totalAmount),
        },
      },
    });

    res.status(200).json({ message: 'Purchase record deleted successfully' });
  } catch (error: any) {
    console.error('deletePurchase error:', error);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
}

// PUT /api/expenses/purchases/:id
export async function updatePurchase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Purchase record not found' });
      return;
    }

    const validation = purchaseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const {
      supplierName,
      itemName,
      category,
      quantity,
      uom,
      unitPrice,
      totalAmount,
      supplierBillNo,
      paymentStatus,
      purchaseDate,
      remarks,
    } = validation.data;

    const computedTotal = totalAmount || Math.round(quantity * unitPrice * 100) / 100;

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        supplierName: supplierName || null,
        itemName,
        category,
        quantity,
        uom: uom || 'pcs',
        unitPrice,
        totalAmount: computedTotal,
        supplierBillNo: supplierBillNo || null,
        paymentStatus: paymentStatus || 'PAID',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
        remarks: remarks || null,
      },
    });

    res.status(200).json({
      message: 'Purchase updated successfully',
      purchase: updated,
    });
  } catch (error: any) {
    console.error('updatePurchase error:', error);
    res.status(500).json({ error: 'Failed to update purchase' });
  }
}

// GET /api/expenses/operating
export async function getOtherExpenses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, search } = req.query;
    const where: any = {};

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const expenses = await prisma.otherExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });

    const totalAgg = await prisma.otherExpense.aggregate({
      _sum: { amount: true },
    });

    res.status(200).json({
      expenses,
      totalAmount: Number(totalAgg._sum.amount || 0),
    });
  } catch (error: any) {
    console.error('getOtherExpenses error:', error);
    res.status(500).json({ error: 'Failed to fetch operating expenses' });
  }
}

// POST /api/expenses/operating
export async function createOtherExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = otherExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { category, description, amount, expenseDate, paymentMode, referenceNo, remarks } =
      validation.data;

    const expense = await prisma.otherExpense.create({
      data: {
        category,
        description,
        amount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMode: paymentMode || null,
        referenceNo: referenceNo || null,
        remarks: remarks || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'EXPENSE',
        entityId: expense.id,
        action: 'CREATE',
        changedBy: req.user?.username || 'admin',
        newValues: {
          category,
          description,
          amount,
        },
      },
    });

    res.status(201).json({
      message: `Expense of ₹${amount.toLocaleString('en-IN')} recorded successfully`,
      expense,
    });
  } catch (error: any) {
    console.error('createOtherExpense error:', error);
    res.status(500).json({ error: 'Failed to record expense' });
  }
}

// DELETE /api/expenses/operating/:id
export async function deleteOtherExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const expense = await prisma.otherExpense.findUnique({ where: { id } });
    if (!expense) {
      res.status(404).json({ error: 'Expense record not found' });
      return;
    }

    await prisma.otherExpense.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: 'EXPENSE',
        entityId: id,
        action: 'DELETE',
        changedBy: req.user?.username || 'admin',
        reason: 'Manual deletion',
        oldValues: {
          category: expense.category,
          amount: Number(expense.amount),
        },
      },
    });

    res.status(200).json({ message: 'Expense record deleted successfully' });
  } catch (error: any) {
    console.error('deleteOtherExpense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}

// PUT /api/expenses/operating/:id
export async function updateOtherExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.otherExpense.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Expense record not found' });
      return;
    }

    const validation = otherExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { category, description, amount, expenseDate, paymentMode, referenceNo, remarks } =
      validation.data;

    const updated = await prisma.otherExpense.update({
      where: { id },
      data: {
        category,
        description,
        amount,
        expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
        paymentMode: paymentMode || null,
        referenceNo: referenceNo || null,
        remarks: remarks || null,
      },
    });

    res.status(200).json({
      message: 'Expense record updated successfully',
      expense: updated,
    });
  } catch (error: any) {
    console.error('updateOtherExpense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
}

// GET /api/expenses/summary - Consolidated outflow analytics
export async function getExpenseSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [purchasesAgg, operatingAgg] = await Promise.all([
      prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
      prisma.otherExpense.aggregate({ _sum: { amount: true } }),
    ]);

    const totalPurchases = Number(purchasesAgg._sum.totalAmount || 0);
    const totalOperating = Number(operatingAgg._sum.amount || 0);
    const totalOutflow = totalPurchases + totalOperating;

    res.status(200).json({
      totalPurchases,
      totalOperating,
      totalOutflow,
    });
  } catch (error: any) {
    console.error('getExpenseSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
}

