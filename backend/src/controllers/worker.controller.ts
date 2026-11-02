import { Request, Response } from 'express';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ApprovalStatus, Role } from '@prisma/client';

const dailyWorkSchema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  materialId: z.string().optional().nullable(),
  description: z.string().min(1, 'Work description is required'),
  drawingNumber: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  quantityDone: z.number().min(0.01, 'Quantity completed must be greater than 0'),
  quantityScrap: z.number().min(0).default(0),
  workingHours: z.number().min(0.1).optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const workerProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  employeeId: z.string().min(2, 'Employee ID is required'),
  phoneNumber: z.string().optional().nullable(),
  monthlySalary: z.number().min(0, 'Monthly salary cannot be negative'),
});

// Worker: Submit daily work
export async function submitDailyWork(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let workerId = req.body.workerId;

    if (req.user.role === Role.WORKER) {
      const workerProfile = await prisma.workerProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!workerProfile) {
        res.status(403).json({ error: 'Worker profile not found for current user' });
        return;
      }
      workerId = workerProfile.id;
    } else if (!workerId) {
      // If Admin logging, grab default or first worker
      const firstWorker = await prisma.workerProfile.findFirst();
      if (firstWorker) {
        workerId = firstWorker.id;
      } else {
        res.status(400).json({ error: 'No active worker profile available to assign work' });
        return;
      }
    }

    const parseResult = dailyWorkSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    const workEntry = await prisma.workerDailyWork.create({
      data: {
        workerId,
        companyId: data.companyId,
        materialId: data.materialId || null,
        description: data.description,
        drawingNumber: data.drawingNumber || null,
        partNumber: data.partNumber || null,
        quantityDone: data.quantityDone,
        quantityScrap: data.quantityScrap,
        workingHours: data.workingHours || null,
        remarks: data.remarks || null,
        status: req.user.role === Role.ADMIN ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
      },
      include: {
        company: { select: { name: true } },
        material: { select: { productName: true, partNumber: true } },
        worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
      },
    });

    res.status(201).json({
      message:
        req.user.role === Role.ADMIN
          ? 'Daily production recorded and approved'
          : 'Daily work submitted successfully for admin approval',
      workEntry,
    });
  } catch (error: any) {
    console.error('submitDailyWork error:', error);
    res.status(500).json({ error: 'Failed to submit daily work entry' });
  }
}

// Worker / Admin: Get daily work entries
export async function getDailyWork(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isWorker = req.user.role === Role.WORKER;
    const { status, companyId } = req.query;
    let whereClause: any = {};

    if (isWorker) {
      const workerProfile = await prisma.workerProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!workerProfile) {
        res.status(403).json({ error: 'Worker profile not found' });
        return;
      }
      whereClause.workerId = workerProfile.id;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status as ApprovalStatus;
    }

    if (companyId && typeof companyId === 'string') {
      whereClause.companyId = companyId;
    }

    const entries = await prisma.workerDailyWork.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, name: true } },
        material: { select: { id: true, productName: true, partNumber: true } },
        worker: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { fullName: true, username: true } },
          },
        },
      },
      orderBy: { workDate: 'desc' },
      take: 100,
    });

    res.status(200).json({ entries });
  } catch (error: any) {
    console.error('getDailyWork error:', error);
    res.status(500).json({ error: 'Failed to retrieve daily work entries' });
  }
}

// Admin: Approve Daily Work Entry
export async function approveDailyWork(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const entry = await prisma.workerDailyWork.findUnique({
      where: { id },
      include: {
        worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
        company: { select: { name: true } },
      },
    });

    if (!entry) {
      res.status(404).json({ error: 'Daily work entry not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const appEntry = await tx.workerDailyWork.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'DAILY_WORK',
          entityId: id,
          action: 'APPROVE',
          changedBy: req.user?.username || 'admin',
          newValues: {
            workerName: entry.worker.user.fullName,
            companyName: entry.company.name,
            quantityDone: Number(entry.quantityDone),
            quantityScrap: Number(entry.quantityScrap),
          },
        },
      });

      return appEntry;
    });

    res.status(200).json({
      message: `Production entry for ${entry.worker.user.fullName} approved successfully`,
      entry: updated,
    });
  } catch (error: any) {
    console.error('approveDailyWork error:', error);
    res.status(500).json({ error: 'Failed to approve daily work entry' });
  }
}

// Admin: Reject Daily Work Entry with feedback
export async function rejectDailyWork(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const entry = await prisma.workerDailyWork.findUnique({
      where: { id },
      include: {
        worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
      },
    });

    if (!entry) {
      res.status(404).json({ error: 'Daily work entry not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rejEntry = await tx.workerDailyWork.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          remarks: entry.remarks
            ? `${entry.remarks} | REJECTED: ${reason || 'Quantity count mismatch'}`
            : `REJECTED: ${reason || 'Quantity count mismatch'}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'DAILY_WORK',
          entityId: id,
          action: 'REJECT',
          changedBy: req.user?.username || 'admin',
          reason: reason || 'Not specified',
          newValues: {
            workerName: entry.worker.user.fullName,
            status: 'REJECTED',
          },
        },
      });

      return rejEntry;
    });

    res.status(200).json({
      message: `Production entry for ${entry.worker.user.fullName} returned with revision remarks`,
      entry: updated,
    });
  } catch (error: any) {
    console.error('rejectDailyWork error:', error);
    res.status(500).json({ error: 'Failed to reject daily work entry' });
  }
}

// Admin: Get all worker profiles
export async function getWorkerProfiles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const workers = await prisma.workerProfile.findMany({
      include: {
        user: { select: { id: true, username: true, fullName: true, isActive: true } },
        _count: { select: { dailyWork: true } },
      },
      orderBy: { employeeId: 'asc' },
    });

    res.status(200).json({ workers });
  } catch (error: any) {
    console.error('getWorkerProfiles error:', error);
    res.status(500).json({ error: 'Failed to retrieve worker profiles' });
  }
}

// Admin: Create new worker profile
export async function createWorkerProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = workerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { username, password, fullName, employeeId, phoneNumber, monthlySalary } = validation.data;

    // Check unique username & employeeId
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      res.status(400).json({ error: `Username ${username} is already taken` });
      return;
    }

    const existingEmp = await prisma.workerProfile.findUnique({ where: { employeeId } });
    if (existingEmp) {
      res.status(400).json({ error: `Employee ID ${employeeId} already exists` });
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName,
          role: Role.WORKER,
        },
      });

      const profile = await tx.workerProfile.create({
        data: {
          userId: user.id,
          employeeId,
          phoneNumber: phoneNumber || null,
          monthlySalary,
        },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'WORKER_PROFILE',
          entityId: profile.id,
          action: 'CREATE',
          changedBy: req.user?.username || 'admin',
          newValues: {
            employeeId,
            fullName,
            monthlySalary,
          },
        },
      });

      return profile;
    });

    res.status(201).json({
      message: `Worker ${fullName} (${employeeId}) created successfully`,
      worker: result,
    });
  } catch (error: any) {
    console.error('createWorkerProfile error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create worker profile' });
  }
}

// Admin: Get production summary metrics
export async function getProductionSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [totalDoneAgg, totalScrapAgg, pendingCount, approvedCount] = await Promise.all([
      prisma.workerDailyWork.aggregate({
        _sum: { quantityDone: true },
        where: { status: ApprovalStatus.APPROVED },
      }),
      prisma.workerDailyWork.aggregate({
        _sum: { quantityScrap: true },
        where: { status: ApprovalStatus.APPROVED },
      }),
      prisma.workerDailyWork.count({ where: { status: ApprovalStatus.PENDING } }),
      prisma.workerDailyWork.count({ where: { status: ApprovalStatus.APPROVED } }),
    ]);

    const totalFinished = Number(totalDoneAgg._sum.quantityDone || 0);
    const totalScrap = Number(totalScrapAgg._sum.quantityScrap || 0);
    const totalProduced = totalFinished + totalScrap;
    const scrapRate = totalProduced > 0 ? Math.round((totalScrap / totalProduced) * 1000) / 10 : 0;

    res.status(200).json({
      totalFinishedPieces: totalFinished,
      totalScrapPieces: totalScrap,
      scrapRatePercent: scrapRate,
      pendingApprovals: pendingCount,
      approvedEntries: approvedCount,
    });
  } catch (error: any) {
    console.error('getProductionSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch production summary' });
  }
}

// Admin: Update daily work
export async function updateDailyWork(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const parseResult = dailyWorkSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }
    const data = parseResult.data;
    const updated = await prisma.workerDailyWork.update({
      where: { id },
      data: {
        companyId: data.companyId,
        materialId: data.materialId || null,
        description: data.description,
        drawingNumber: data.drawingNumber || null,
        partNumber: data.partNumber || null,
        quantityDone: data.quantityDone,
        quantityScrap: data.quantityScrap,
        workingHours: data.workingHours || null,
        remarks: data.remarks || null,
      },
    });
    res.status(200).json({ message: 'Daily work entry updated', workEntry: updated });
  } catch (e: any) {
    console.error('updateDailyWork error:', e);
    res.status(500).json({ error: 'Failed to update daily work' });
  }
}

// Admin: Delete daily work
export async function deleteDailyWork(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.workerDailyWork.delete({ where: { id } });
    res.status(200).json({ message: 'Daily work entry deleted successfully' });
  } catch (e: any) {
    console.error('deleteDailyWork error:', e);
    res.status(500).json({ error: 'Failed to delete daily work entry' });
  }
}

// Admin: Update worker profile
export async function updateWorkerProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber, monthlySalary, employeeId, password } = req.body;

    const profile = await prisma.workerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!profile) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const userUpdate: any = {};
      if (fullName) userUpdate.fullName = fullName;
      if (password && password.length >= 6) {
        userUpdate.passwordHash = await bcryptjs.hash(password, 10);
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: profile.userId },
          data: userUpdate,
        });
      }

      await tx.workerProfile.update({
        where: { id },
        data: {
          employeeId: employeeId || profile.employeeId,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : profile.phoneNumber,
          monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : profile.monthlySalary,
        },
      });
    });

    res.status(200).json({ message: 'Worker profile updated successfully' });
  } catch (e: any) {
    console.error('updateWorkerProfile error:', e);
    res.status(500).json({ error: 'Failed to update worker profile' });
  }
}

// Admin: Delete worker profile
export async function deleteWorkerProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const profile = await prisma.workerProfile.findUnique({ where: { id } });
    if (!profile) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.workerDailyWork.deleteMany({ where: { workerId: id } });
      await tx.attendance.deleteMany({ where: { workerId: id } });
      await tx.overtimeEntry.deleteMany({ where: { workerId: id } });
      await tx.extraShiftEntry.deleteMany({ where: { workerId: id } });
      await tx.salaryRecord.deleteMany({ where: { workerId: id } });
      await tx.workerProfile.delete({ where: { id } });
      await tx.user.delete({ where: { id: profile.userId } });
    });

    res.status(200).json({ message: 'Worker profile and account deleted successfully' });
  } catch (e: any) {
    console.error('deleteWorkerProfile error:', e);
    res.status(500).json({ error: 'Failed to delete worker profile' });
  }
}
