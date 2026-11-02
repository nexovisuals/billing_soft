import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const materialSchema = z.object({
  productName: z.string().min(2, 'Product or component name is required'),
  drawingNumber: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  rate: z.number().min(0, 'Rate must be a non-negative number').default(0),
  uom: z.string().min(1, 'Unit of measurement is required').default('nos'),
  hsnSacCode: z.string().min(2, 'HSN/SAC code is required').default('998898'),
  gstRate: z.number().min(0).max(100).default(18.0),
  isActive: z.boolean().optional().default(true),
});

// GET /api/materials - List all materials
export async function getMaterials(req: AuthRequest, res: Response): Promise<void> {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { productName: 'asc' },
      include: {
        _count: {
          select: {
            dcItems: true,
            invoiceItems: true,
            dailyWork: true,
          },
        },
      },
    });

    res.status(200).json({ materials });
  } catch (error: any) {
    console.error('getMaterials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
}

// POST /api/materials - Create new material
export async function createMaterial(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parseResult = materialSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    const material = await prisma.material.create({
      data: {
        productName: data.productName,
        drawingNumber: data.drawingNumber || null,
        partNumber: data.partNumber || null,
        description: data.description || null,
        rate: data.rate,
        uom: data.uom,
        hsnSacCode: data.hsnSacCode,
        gstRate: data.gstRate,
        isActive: data.isActive ?? true,
      },
    });

    // Log to audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'MATERIAL',
        entityId: material.id,
        action: 'CREATE',
        changedBy: req.user?.username || 'admin',
        newValues: material as any,
      },
    });

    res.status(201).json({
      message: 'Product/Material registered successfully',
      material,
    });
  } catch (error: any) {
    console.error('createMaterial error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
}

// PUT /api/materials/:id - Update material
export async function updateMaterial(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const parseResult = materialSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.material.update({
      where: { id },
      data: {
        productName: data.productName ?? existing.productName,
        drawingNumber: data.drawingNumber !== undefined ? data.drawingNumber : existing.drawingNumber,
        partNumber: data.partNumber !== undefined ? data.partNumber : existing.partNumber,
        description: data.description !== undefined ? data.description : existing.description,
        rate: data.rate !== undefined ? data.rate : existing.rate,
        uom: data.uom ?? existing.uom,
        hsnSacCode: data.hsnSacCode ?? existing.hsnSacCode,
        gstRate: data.gstRate !== undefined ? data.gstRate : existing.gstRate,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    // Log update
    await prisma.auditLog.create({
      data: {
        entityType: 'MATERIAL',
        entityId: id,
        action: 'UPDATE',
        changedBy: req.user?.username || 'admin',
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    res.status(200).json({
      message: 'Material updated successfully',
      material: updated,
    });
  } catch (error: any) {
    console.error('updateMaterial error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
}

// DELETE /api/materials/:id - Delete or Deactivate
export async function deleteMaterial(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: { dcItems: true, invoiceItems: true, dailyWork: true },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    // If material has linked transactions, soft-deactivate instead of hard delete
    if (existing._count.dcItems > 0 || existing._count.invoiceItems > 0 || existing._count.dailyWork > 0) {
      const deactivated = await prisma.material.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        message: 'Material has existing DCs/Invoices and has been marked Inactive to preserve audit records.',
        material: deactivated,
      });
      return;
    }

    await prisma.material.delete({ where: { id } });

    res.status(200).json({ message: 'Material deleted successfully' });
  } catch (error: any) {
    console.error('deleteMaterial error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
}

