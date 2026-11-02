import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { DCStatus } from '@prisma/client';

const dcItemSchema = z.object({
  materialId: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  drawingNumber: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
  uom: z.string().min(1).default('nos'),
  remarks: z.string().optional().nullable(),
});

const createDcSchema = z.object({
  companyId: z.string().min(1, 'Customer company is required'),
  dcDate: z.string().optional(),
  yourOrderNo: z.string().optional().nullable(),
  yourOrderDate: z.string().optional().nullable(),
  ewayBillNumber: z.string().optional().nullable(),
  materialValue: z.number().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(dcItemSchema).min(1, 'At least one part or component must be dispatched'),
});

// Helper: Get next continuous sequential DC number
export async function getNextDcNumber(): Promise<number> {
  const lastDc = await prisma.deliveryChallan.findFirst({
    orderBy: { dcNumber: 'desc' },
    select: { dcNumber: true },
  });
  // If no DCs exist yet, we can start from 368 (matching the physical sample) or 1
  return lastDc ? lastDc.dcNumber + 1 : 368;
}

// GET /api/dcs/next-number - Returns the next sequential DC number
export async function getNextNumber(req: AuthRequest, res: Response): Promise<void> {
  try {
    const nextNumber = await getNextDcNumber();
    res.status(200).json({ nextDcNumber: nextNumber });
  } catch (error: any) {
    console.error('getNextNumber error:', error);
    res.status(500).json({ error: 'Failed to generate next DC number' });
  }
}

// GET /api/dcs - List all Delivery Challans
export async function getDeliveryChallans(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, companyId } = req.query;
    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as DCStatus;
    }

    if (companyId && typeof companyId === 'string') {
      where.companyId = companyId;
    }

    const dcs = await prisma.deliveryChallan.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, address: true, gstin: true, phoneNumber: true },
        },
        items: {
          include: {
            material: { select: { productName: true, drawingNumber: true, partNumber: true, rate: true } },
          },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, invoiceDate: true },
        },
      },
      orderBy: { dcNumber: 'desc' },
      take: 100,
    });

    res.status(200).json({ dcs });
  } catch (error: any) {
    console.error('getDeliveryChallans error:', error);
    res.status(500).json({ error: 'Failed to fetch Delivery Challans' });
  }
}

// GET /api/dcs/:id - Single DC details
export async function getDeliveryChallanById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const dc = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: {
        company: true,
        items: {
          include: { material: true },
        },
        invoice: true,
      },
    });

    if (!dc) {
      res.status(404).json({ error: 'Delivery Challan not found' });
      return;
    }

    res.status(200).json({ dc });
  } catch (error: any) {
    console.error('getDeliveryChallanById error:', error);
    res.status(500).json({ error: 'Failed to retrieve DC details' });
  }
}

// POST /api/dcs - Create new Delivery Challan
export async function createDeliveryChallan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parseResult = createDcSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    // Verify company
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) {
      res.status(404).json({ error: 'Customer company not found' });
      return;
    }

    // Atomic transaction: assign next sequential DC number and insert items
    const nextNumber = await getNextDcNumber();
    const dcDate = data.dcDate ? new Date(data.dcDate) : new Date();
    const yourOrderDate = data.yourOrderDate ? new Date(data.yourOrderDate) : null;

    const dc = await prisma.$transaction(async (tx) => {
      const createdDc = await tx.deliveryChallan.create({
        data: {
          dcNumber: nextNumber,
          dcDate,
          companyId: data.companyId,
          yourOrderNo: data.yourOrderNo || null,
          yourOrderDate,
          ewayBillNumber: data.ewayBillNumber || null,
          materialValue: data.materialValue || null,
          remarks: data.remarks || null,
          status: DCStatus.PENDING_INVOICING,
          createdBy: req.user?.username || 'admin',
          items: {
            create: data.items.map((item) => ({
              materialId: item.materialId || null,
              description: item.description,
              drawingNumber: item.drawingNumber || null,
              partNumber: item.partNumber || null,
              quantity: item.quantity,
              uom: item.uom,
              remarks: item.remarks || null,
            })),
          },
        },
        include: {
          company: true,
          items: true,
        },
      });

      // Record outward returned finished goods in company stock ledger
      const lastStock = await tx.companyStockLedger.findFirst({
        where: { companyId: data.companyId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastStock ? Number(lastStock.balance) : 0;

      const totalDispatchedPieces = data.items.reduce((sum, item) => sum + item.quantity, 0);

      await tx.companyStockLedger.create({
        data: {
          companyId: data.companyId,
          movementType: 'RETURNED_FINISHED',
          quantityIn: 0,
          quantityOut: 0, // In CNC Job work, stock balance in kg is tracked; DC records finished parts count
          balance: currentBalance,
          referenceDcId: createdDc.id,
          remarks: `Dispatched DC #${createdDc.dcNumber} (${totalDispatchedPieces} pcs) to ${company.name}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'DELIVERY_CHALLAN',
          entityId: createdDc.id,
          action: 'CREATE',
          changedBy: req.user?.username || 'admin',
          newValues: {
            dcNumber: createdDc.dcNumber,
            company: company.name,
            itemsCount: data.items.length,
          },
        },
      });

      return createdDc;
    });

    res.status(201).json({
      message: `Delivery Challan #${dc.dcNumber} generated successfully!`,
      dc,
    });
  } catch (error: any) {
    console.error('createDeliveryChallan error:', error);
    res.status(500).json({ error: 'Failed to generate Delivery Challan' });
  }
}

// PUT /api/dcs/:id - Update Delivery Challan
export async function updateDeliveryChallan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = createDcSchema.parse(req.body);

    const existingDc = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!existingDc) {
      res.status(404).json({ error: 'Delivery Challan not found' });
      return;
    }

    if (existingDc.status === DCStatus.INVOICED) {
      res.status(400).json({
        error: `Cannot edit DC #${existingDc.dcNumber} because it has already been invoiced in Invoice #${existingDc.invoice?.invoiceNumber}.`,
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old items and insert updated items
      await tx.dCItem.deleteMany({
        where: { dcId: id },
      });

      const dc = await tx.deliveryChallan.update({
        where: { id },
        data: {
          companyId: data.companyId,
          dcDate: data.dcDate ? new Date(data.dcDate) : existingDc.dcDate,
          yourOrderNo: data.yourOrderNo,
          yourOrderDate: data.yourOrderDate ? new Date(data.yourOrderDate) : null,
          ewayBillNumber: data.ewayBillNumber,
          materialValue: data.materialValue ?? null,
          remarks: data.remarks,
          items: {
            create: data.items.map((item) => ({
              materialId: item.materialId || null,
              description: item.description,
              drawingNumber: item.drawingNumber || null,
              partNumber: item.partNumber || null,
              quantity: item.quantity,
              uom: item.uom,
              remarks: item.remarks || null,
            })),
          },
        },
        include: {
          company: true,
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'DELIVERY_CHALLAN',
          entityId: id,
          action: 'UPDATE',
          changedBy: req.user?.username || 'admin',
          reason: 'Admin updated DC details',
        },
      });

      return dc;
    });

    res.status(200).json({
      message: `Delivery Challan #${updated.dcNumber} updated successfully!`,
      dc: updated,
    });
  } catch (error: any) {
    console.error('updateDeliveryChallan error:', error);
    res.status(500).json({ error: error.message || 'Failed to update Delivery Challan' });
  }
}

// PUT /api/dcs/:id/cancel - Cancel Delivery Challan
export async function cancelDeliveryChallan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const dc = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!dc) {
      res.status(404).json({ error: 'Delivery Challan not found' });
      return;
    }

    if (dc.status === DCStatus.INVOICED) {
      res.status(400).json({
        error: `Cannot cancel DC #${dc.dcNumber} because it has already been invoiced in Invoice #${dc.invoice?.invoiceNumber}. You must cancel or remove it from the invoice first.`,
      });
      return;
    }

    const cancelledDc = await prisma.deliveryChallan.update({
      where: { id },
      data: {
        status: DCStatus.CANCELLED,
        remarks: dc.remarks ? `${dc.remarks} [CANCELLED: ${reason || 'Admin request'}]` : `[CANCELLED: ${reason || 'Admin request'}]`,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'DELIVERY_CHALLAN',
        entityId: id,
        action: 'CANCEL',
        changedBy: req.user?.username || 'admin',
        reason: reason || 'Admin cancelled DC',
      },
    });

    res.status(200).json({
      message: `Delivery Challan #${dc.dcNumber} has been cancelled. The DC number is preserved and locked.`,
      dc: cancelledDc,
    });
  } catch (error: any) {
    console.error('cancelDeliveryChallan error:', error);
    res.status(500).json({ error: 'Failed to cancel Delivery Challan' });
  }
}

