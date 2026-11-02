import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required and must be at least 2 characters'),
  address: z.string().min(5, 'Registered company address is required'),
  gstin: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  emailAddress: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  openingBalance: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// GET /api/companies - List all companies
export async function getCompanies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            challans: true,
            invoices: true,
            receipts: true,
          },
        },
      },
    });

    res.status(200).json({ companies });
  } catch (error: any) {
    console.error('getCompanies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
}

// POST /api/companies - Create new company
export async function createCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parseResult = companySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    // Check if company with exact same name already exists
    const existing = await prisma.company.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });

    if (existing) {
      res.status(409).json({ error: 'A company with this name already exists' });
      return;
    }

    const company = await prisma.company.create({
      data: {
        name: data.name,
        address: data.address,
        gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
        contactPerson: data.contactPerson || null,
        phoneNumber: data.phoneNumber || null,
        emailAddress: data.emailAddress || null,
        isActive: data.isActive ?? true,
      },
    });

    // If opening stock balance was specified, create an initial inward stock entry
    if (data.openingBalance && data.openingBalance > 0) {
      await prisma.companyStockLedger.create({
        data: {
          companyId: company.id,
          movementType: 'INWARD_RECEIPT',
          quantityIn: data.openingBalance,
          quantityOut: 0,
          balance: data.openingBalance,
          remarks: 'Opening raw material balance',
        },
      });
    }

    // Log to audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'COMPANY',
        entityId: company.id,
        action: 'CREATE',
        changedBy: req.user?.username || 'admin',
        newValues: company as any,
      },
    });

    res.status(201).json({
      message: 'Company registered successfully',
      company,
    });
  } catch (error: any) {
    console.error('createCompany error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
}

// PUT /api/companies/:id - Update company
export async function updateCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const parseResult = companySchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.company.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        address: data.address ?? existing.address,
        gstin: data.gstin !== undefined ? (data.gstin ? data.gstin.trim().toUpperCase() : null) : existing.gstin,
        contactPerson: data.contactPerson !== undefined ? data.contactPerson : existing.contactPerson,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : existing.phoneNumber,
        emailAddress: data.emailAddress !== undefined ? data.emailAddress : existing.emailAddress,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    // Log update
    await prisma.auditLog.create({
      data: {
        entityType: 'COMPANY',
        entityId: id,
        action: 'UPDATE',
        changedBy: req.user?.username || 'admin',
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    res.status(200).json({
      message: 'Company updated successfully',
      company: updated,
    });
  } catch (error: any) {
    console.error('updateCompany error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
}

// DELETE /api/companies/:id - Delete or Deactivate
export async function deleteCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challans: true, invoices: true, receipts: true },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // If company has linked transactions (DCs or invoices), soft-deactivate instead of hard delete to preserve history
    if (existing._count.challans > 0 || existing._count.invoices > 0 || existing._count.receipts > 0) {
      const deactivated = await prisma.company.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        message: 'Company has existing DCs/Invoices and has been marked Inactive to preserve audit records.',
        company: deactivated,
      });
      return;
    }

    // Otherwise, safe to permanently delete
    await prisma.company.delete({ where: { id } });

    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (error: any) {
    console.error('deleteCompany error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
}

