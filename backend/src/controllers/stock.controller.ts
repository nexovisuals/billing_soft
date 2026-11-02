import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { StockMovementType } from '@prisma/client';

const receiptSchema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  materialName: z.string().min(2, 'Raw material name is required (e.g. Steel Round Bar EN8)'),
  partNumber: z.string().optional().nullable(),
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
  uom: z.string().min(1).default('kg'),
  challanNumber: z.string().optional().nullable(), // Customer delivery note number
  vehicleNumber: z.string().optional().nullable(),
  receiptDate: z.string().optional(),
  remarks: z.string().optional().nullable(),
});

const movementSchema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  materialId: z.string().optional().nullable(),
  movementType: z.enum([
    'INWARD_RECEIPT',
    'ISSUED_MACHINING',
    'RETURNED_FINISHED',
    'RETURNED_RAW',
    'SCRAP_WASTAGE',
    'ADJUSTMENT',
  ]),
  quantityIn: z.number().min(0).default(0),
  quantityOut: z.number().min(0).default(0),
  referenceDcId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// Helper: Get current company balance
async function getCompanyCurrentBalance(companyId: string): Promise<number> {
  const lastEntry = await prisma.companyStockLedger.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });
  return lastEntry ? Number(lastEntry.balance) : 0;
}

// POST /api/stock/receipts - Record customer raw material arrival
export async function createRawMaterialReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parseResult = receiptSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const receiptDate = data.receiptDate ? new Date(data.receiptDate) : new Date();

    // 1. Create Receipt Entry
    const receipt = await prisma.rawMaterialReceipt.create({
      data: {
        companyId: data.companyId,
        materialName: data.materialName,
        partNumber: data.partNumber || null,
        quantity: data.quantity,
        uom: data.uom,
        challanNumber: data.challanNumber || null,
        vehicleNumber: data.vehicleNumber || null,
        receiptDate,
        remarks: data.remarks || null,
      },
    });

    // 2. Automatically update Company Stock Ledger
    const currentBalance = await getCompanyCurrentBalance(data.companyId);
    const newBalance = currentBalance + data.quantity;

    await prisma.companyStockLedger.create({
      data: {
        companyId: data.companyId,
        movementType: StockMovementType.INWARD_RECEIPT,
        quantityIn: data.quantity,
        quantityOut: 0,
        balance: newBalance,
        remarks: `Customer DC: ${data.challanNumber || 'N/A'} • Material: ${data.materialName}${
          data.remarks ? ' • ' + data.remarks : ''
        }`,
      },
    });

    // 3. Audit Log
    await prisma.auditLog.create({
      data: {
        entityType: 'STOCK_RECEIPT',
        entityId: receipt.id,
        action: 'CREATE',
        changedBy: req.user?.username || 'admin',
        newValues: receipt as any,
      },
    });

    res.status(201).json({
      message: 'Raw material receipt recorded and stock ledger updated',
      receipt,
      newBalance,
    });
  } catch (error: any) {
    console.error('createRawMaterialReceipt error:', error);
    res.status(500).json({ error: 'Failed to record raw material receipt' });
  }
}

// DELETE /api/stock/receipts/:id
export async function deleteRawMaterialReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const receipt = await prisma.rawMaterialReceipt.findUnique({ where: { id } });
    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    // Revert balance in stock ledger
    const currentBalance = await getCompanyCurrentBalance(receipt.companyId);
    const newBalance = Math.max(0, currentBalance - Number(receipt.quantity));

    await prisma.companyStockLedger.create({
      data: {
        companyId: receipt.companyId,
        movementType: StockMovementType.ADJUSTMENT,
        quantityIn: 0,
        quantityOut: Number(receipt.quantity),
        balance: newBalance,
        remarks: `Reversal: Inward Receipt Deleted (${receipt.materialName} - ${receipt.quantity} ${receipt.uom})`,
      },
    });

    await prisma.rawMaterialReceipt.delete({ where: { id } });

    res.status(200).json({ message: 'Receipt deleted and stock ledger updated' });
  } catch (error: any) {
    console.error('deleteRawMaterialReceipt error:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
}

// PUT /api/stock/receipts/:id - Edit Inward Receipt
export async function updateRawMaterialReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const receipt = await prisma.rawMaterialReceipt.findUnique({ where: { id } });
    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    const {
      companyId,
      materialName,
      quantity,
      uom,
      challanNo,
      vehicleNo,
      receiptDate,
      remarks,
    } = req.body;

    const oldQty = Number(receipt.quantity);
    const newQty = quantity !== undefined ? Number(quantity) : oldQty;
    const targetCompanyId = companyId || receipt.companyId;

    // Adjust ledger if quantity changed
    if (newQty !== oldQty || targetCompanyId !== receipt.companyId) {
      const currentBalance = await getCompanyCurrentBalance(receipt.companyId);
      const diff = newQty - oldQty;
      const updatedBal = Math.max(0, currentBalance + diff);

      await prisma.companyStockLedger.create({
        data: {
          companyId: targetCompanyId,
          movementType: StockMovementType.INWARD_RECEIPT,
          quantityIn: diff > 0 ? diff : 0,
          quantityOut: diff < 0 ? Math.abs(diff) : 0,
          balance: updatedBal,
          remarks: `Adjustment: Receipt #${id.substring(0, 8)} edited (${oldQty} -> ${newQty} ${uom || receipt.uom})`,
        },
      });
    }

    const updated = await prisma.rawMaterialReceipt.update({
      where: { id },
      data: {
        companyId: targetCompanyId,
        materialName: materialName !== undefined ? materialName : receipt.materialName,
        quantity: newQty,
        uom: uom || receipt.uom,
        challanNumber: challanNo !== undefined ? challanNo : receipt.challanNumber,
        vehicleNumber: vehicleNo !== undefined ? vehicleNo : receipt.vehicleNumber,
        receiptDate: receiptDate ? new Date(receiptDate) : receipt.receiptDate,
        remarks: remarks !== undefined ? remarks : receipt.remarks,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({
      message: 'Inward material receipt updated successfully',
      receipt: updated,
    });
  } catch (error: any) {
    console.error('updateRawMaterialReceipt error:', error);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
}

// GET /api/stock/receipts - List recent receipts
export async function getRawMaterialReceipts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { companyId } = req.query;
    const where: any = {};
    if (companyId && typeof companyId === 'string') {
      where.companyId = companyId;
    }

    const receipts = await prisma.rawMaterialReceipt.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { receiptDate: 'desc' },
      take: 100,
    });

    res.status(200).json({ receipts });
  } catch (error: any) {
    console.error('getRawMaterialReceipts error:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
}

// GET /api/stock/ledger - Get company-wise stock ledger
export async function getCompanyLedger(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      res.status(400).json({ error: 'companyId is required to view stock ledger' });
      return;
    }

    const ledger = await prisma.companyStockLedger.findMany({
      where: { companyId },
      include: {
        company: { select: { name: true } },
        material: { select: { productName: true, partNumber: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    const currentBalance = await getCompanyCurrentBalance(companyId);

    res.status(200).json({ ledger, currentBalance });
  } catch (error: any) {
    console.error('getCompanyLedger error:', error);
    res.status(500).json({ error: 'Failed to fetch stock ledger' });
  }
}

// GET /api/stock/summary - Consolidated company balances
export async function getStockSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        stockLedger: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { balance: true, transactionDate: true },
        },
        _count: {
          select: { receipts: true, challans: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const summary = companies.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      currentBalance: c.stockLedger[0] ? Number(c.stockLedger[0].balance) : 0,
      lastUpdated: c.stockLedger[0]?.transactionDate || null,
      receiptsCount: c._count.receipts,
      challansCount: c._count.challans,
    }));

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error('getStockSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch stock summary' });
  }
}

// POST /api/stock/movement - Record manual stock adjustment / scrap
export async function recordStockMovement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parseResult = movementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;
    const currentBalance = await getCompanyCurrentBalance(data.companyId);

    // Negative stock protection
    if (data.quantityOut > currentBalance) {
      res.status(400).json({
        error: `Negative stock prevented! Requested outward quantity (${data.quantityOut} kg) exceeds current available balance (${currentBalance} kg).`,
      });
      return;
    }

    const newBalance = currentBalance + data.quantityIn - data.quantityOut;

    const entry = await prisma.companyStockLedger.create({
      data: {
        companyId: data.companyId,
        materialId: data.materialId || null,
        movementType: data.movementType,
        quantityIn: data.quantityIn,
        quantityOut: data.quantityOut,
        balance: newBalance,
        referenceDcId: data.referenceDcId || null,
        remarks: data.remarks || null,
      },
    });

    res.status(201).json({
      message: 'Stock movement recorded successfully',
      entry,
      newBalance,
    });
  } catch (error: any) {
    console.error('recordStockMovement error:', error);
    res.status(500).json({ error: 'Failed to record stock movement' });
  }
}

