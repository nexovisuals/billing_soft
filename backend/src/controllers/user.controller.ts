import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'WORKER']),
  phoneNumber: z.string().optional(),
  // Worker profile fields (only if role is WORKER)
  employeeId: z.string().optional(),
  monthlySalary: z.number().optional().default(26000),
  overtimeRate: z.number().optional().default(150),
  extraShiftRate: z.number().optional().default(1000),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'STAFF', 'WORKER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  phoneNumber: z.string().optional(),
  employeeId: z.string().optional(),
  monthlySalary: z.number().optional(),
  overtimeRate: z.number().optional(),
  extraShiftRate: z.number().optional(),
});

// Admin only: Get all users with profiles
export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      include: {
        workerProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      workerProfile: u.workerProfile
        ? {
            id: u.workerProfile.id,
            employeeId: u.workerProfile.employeeId,
            phoneNumber: u.workerProfile.phoneNumber,
            monthlySalary: Number(u.workerProfile.monthlySalary),
            overtimeRate: Number(u.workerProfile.overtimeRate),
            extraShiftRate: Number(u.workerProfile.extraShiftRate),
          }
        : null,
    }));

    res.status(200).json({ users: sanitizedUsers });
  } catch (error: any) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

// Admin only: Create new user
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parse = createUserSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const {
      username,
      fullName,
      password,
      role,
      phoneNumber,
      employeeId,
      monthlySalary,
      overtimeRate,
      extraShiftRate,
    } = parse.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: `Username "${username}" already exists` });
      return;
    }

    if (role === 'WORKER') {
      const generatedEmpId = employeeId || `SVT-EMP-${Date.now().toString().slice(-4)}`;
      const existingEmp = await prisma.workerProfile.findUnique({
        where: { employeeId: generatedEmpId },
      });
      if (existingEmp) {
        res.status(400).json({ error: `Employee ID "${generatedEmpId}" already exists` });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName,
          role: role as Role,
          isActive: true,
        },
      });

      if (role === 'WORKER') {
        const empId = employeeId || `SVT-EMP-${Date.now().toString().slice(-4)}`;
        await tx.workerProfile.create({
          data: {
            userId: user.id,
            employeeId: empId,
            phoneNumber: phoneNumber || null,
            monthlySalary: monthlySalary ?? 26000.0,
            overtimeRate: overtimeRate ?? 150.0,
            extraShiftRate: extraShiftRate ?? 1000.0,
            isActive: true,
          },
        });
      }

      return user;
    });

    res.status(201).json({
      message: `User "${newUser.username}" created successfully with role ${newUser.role}`,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    });
  } catch (error: any) {
    console.error('createUser error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

// Admin only: Update existing user
export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const parse = updateUserSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { workerProfile: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const {
      fullName,
      role,
      isActive,
      password,
      phoneNumber,
      employeeId,
      monthlySalary,
      overtimeRate,
      extraShiftRate,
    } = parse.data;

    // Disallow disabling the main admin if it's the only one
    if (existing.username === 'admin' && isActive === false) {
      res.status(400).json({ error: 'Cannot deactivate root admin account' });
      return;
    }

    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          ...(fullName ? { fullName } : {}),
          ...(role ? { role: role as Role } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      if (existing.workerProfile) {
        await tx.workerProfile.update({
          where: { id: existing.workerProfile.id },
          data: {
            ...(phoneNumber !== undefined ? { phoneNumber } : {}),
            ...(employeeId ? { employeeId } : {}),
            ...(monthlySalary !== undefined ? { monthlySalary } : {}),
            ...(overtimeRate !== undefined ? { overtimeRate } : {}),
            ...(extraShiftRate !== undefined ? { extraShiftRate } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
          },
        });
      } else if (role === 'WORKER') {
        // Promote to worker profile if needed
        const empId = employeeId || `SVT-EMP-${Date.now().toString().slice(-4)}`;
        await tx.workerProfile.create({
          data: {
            userId: u.id,
            employeeId: empId,
            phoneNumber: phoneNumber || null,
            monthlySalary: monthlySalary ?? 26000.0,
            overtimeRate: overtimeRate ?? 150.0,
            extraShiftRate: extraShiftRate ?? 1000.0,
            isActive: true,
          },
        });
      }

      return u;
    });

    res.status(200).json({
      message: `User ${updated.username} updated successfully`,
      user: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (error: any) {
    console.error('updateUser error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

// Admin only: Delete user
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.username === 'admin' || user.id === req.user?.id) {
      res.status(400).json({ error: 'Cannot delete the active logged-in admin account' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.workerProfile.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    res.status(200).json({ message: `User "${user.username}" deleted successfully` });
  } catch (error: any) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// Workable Notifications endpoint
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Pending daily work approvals
    const pendingDailyWork = await prisma.workerDailyWork.findMany({
      where: { status: 'PENDING' },
      include: {
        worker: { select: { user: { select: { fullName: true } } } },
        company: { select: { name: true } },
      },
      take: 10,
    });

    // 2. Unpaid invoices due
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: 'UNPAID' },
      include: { company: { select: { name: true } } },
      take: 10,
    });

    const items = [
      ...pendingDailyWork.map((w) => ({
        id: `work-${w.id}`,
        type: 'APPROVAL',
        title: 'Production Approval Pending',
        message: `${w.worker.user.fullName} logged ${Number(w.quantityDone)} pcs for ${w.company.name}`,
        targetTab: 'workers',
        time: w.workDate,
        severity: 'warning' as const,
      })),
      ...unpaidInvoices.map((inv) => ({
        id: `inv-${inv.id}`,
        type: 'PAYMENT',
        title: 'Outstanding Invoice Due',
        message: `Invoice ${inv.invoiceNumber} for ${inv.company.name} (₹${Number(inv.totalAmount).toLocaleString('en-IN')}) is unpaid`,
        targetTab: 'invoices',
        time: inv.createdAt,
        severity: 'info' as const,
      })),
    ];

    res.status(200).json({
      notifications: items,
      unreadCount: items.length,
    });
  } catch (error: any) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

