import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ApprovalStatus } from '@prisma/client';

// GET /api/approvals/pending - Fetch all pending approval items across all operations
export async function getPendingApprovals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [pendingWork, pendingAttendance, pendingOvertime, pendingShifts] = await Promise.all([
      prisma.workerDailyWork.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
          company: { select: { id: true, name: true } },
          material: { select: { id: true, productName: true, partNumber: true } },
        },
        orderBy: { workDate: 'desc' },
      }),
      prisma.dailyAttendance.findMany({
        where: { approvalStatus: ApprovalStatus.PENDING },
        include: {
          worker: { select: { id: true, employeeId: true, user: { select: { fullName: true } } } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.overtimeEntry.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          worker: { select: { id: true, employeeId: true, user: { select: { fullName: true } } } },
        },
        orderBy: { otDate: 'desc' },
      }),
      prisma.extraShiftEntry.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          worker: { select: { id: true, employeeId: true, user: { select: { fullName: true } } } },
        },
        orderBy: { shiftDate: 'desc' },
      }),
    ]);

    const totalCount =
      pendingWork.length + pendingAttendance.length + pendingOvertime.length + pendingShifts.length;

    res.status(200).json({
      counts: {
        total: totalCount,
        dailyWork: pendingWork.length,
        attendance: pendingAttendance.length,
        overtime: pendingOvertime.length,
        shifts: pendingShifts.length,
      },
      items: {
        dailyWork: pendingWork,
        attendance: pendingAttendance,
        overtime: pendingOvertime,
        shifts: pendingShifts,
      },
    });
  } catch (error: any) {
    console.error('getPendingApprovals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
}

// POST /api/approvals/attendance/:id/approve
export async function approveAttendanceItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const item = await prisma.dailyAttendance.findUnique({
      where: { id },
      include: { worker: { include: { user: true } } },
    });

    if (!item) {
      res.status(404).json({ error: 'Attendance record not found' });
      return;
    }

    const approvedBy = req.user?.username || 'admin';

    // Update Daily Attendance to APPROVED
    await prisma.dailyAttendance.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy,
      },
    });

    // Automatically recalculate and sync monthly attendance record for this worker
    const itemDate = new Date(item.date);
    const m = (itemDate.getMonth() + 1).toString().padStart(2, '0');
    const y = itemDate.getFullYear();
    const monthYear = `${m}-${y}`;

    // Get all approved daily attendance for this worker in this month
    const startOfMonth = new Date(y, itemDate.getMonth(), 1);
    const endOfMonth = new Date(y, itemDate.getMonth() + 1, 0, 23, 59, 59);

    const approvedDays = await prisma.dailyAttendance.findMany({
      where: {
        workerId: item.workerId,
        approvalStatus: ApprovalStatus.APPROVED,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    let totalPresentDays = 0;
    for (const d of approvedDays) {
      if (d.status === 'PRESENT') totalPresentDays += 1;
      else if (d.status === 'HALF_DAY') totalPresentDays += 0.5;
    }

    const standardDays = 26;
    const absentDays = Math.max(0, standardDays - totalPresentDays);

    // Upsert monthly Attendance
    const existingMonthly = await prisma.attendance.findFirst({
      where: { workerId: item.workerId, monthYear },
    });

    if (existingMonthly) {
      await prisma.attendance.update({
        where: { id: existingMonthly.id },
        data: {
          presentDays: totalPresentDays,
          absentDays,
          status: ApprovalStatus.APPROVED,
          approvedBy,
        },
      });
    } else {
      await prisma.attendance.create({
        data: {
          workerId: item.workerId,
          monthYear,
          standardDays,
          presentDays: totalPresentDays,
          absentDays,
          status: ApprovalStatus.APPROVED,
          approvedBy,
        },
      });
    }

    res.status(200).json({
      message: `Attendance for ${item.worker.user.fullName} approved and monthly register updated to ${totalPresentDays} present days`,
    });
  } catch (error: any) {
    console.error('approveAttendanceItem error:', error);
    res.status(500).json({ error: 'Failed to approve attendance' });
  }
}

// POST /api/approvals/attendance/:id/reject
export async function rejectAttendanceItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const item = await prisma.dailyAttendance.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        remarks: reason ? `REJECTED: ${reason}` : 'REJECTED',
      },
    });

    res.status(200).json({ message: 'Attendance entry rejected', item });
  } catch (error: any) {
    console.error('rejectAttendanceItem error:', error);
    res.status(500).json({ error: 'Failed to reject attendance' });
  }
}

// POST /api/approvals/approve-all - One-click approve all pending in category
export async function approveAllPending(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category } = req.body; // 'ALL' | 'DAILY_WORK' | 'ATTENDANCE' | 'OVERTIME' | 'SHIFTS'
    const approvedBy = req.user?.username || 'admin';

    let count = 0;

    if (!category || category === 'ALL' || category === 'DAILY_WORK') {
      const resWork = await prisma.workerDailyWork.updateMany({
        where: { status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.APPROVED },
      });
      count += resWork.count;
    }

    if (!category || category === 'ALL' || category === 'ATTENDANCE') {
      const pendingAtt = await prisma.dailyAttendance.findMany({
        where: { approvalStatus: ApprovalStatus.PENDING },
      });
      for (const a of pendingAtt) {
        await prisma.dailyAttendance.update({
          where: { id: a.id },
          data: { approvalStatus: ApprovalStatus.APPROVED, approvedBy },
        });
      }
      count += pendingAtt.length;
    }

    if (!category || category === 'ALL' || category === 'OVERTIME') {
      const resOt = await prisma.overtimeEntry.updateMany({
        where: { status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.APPROVED },
      });
      count += resOt.count;
    }

    if (!category || category === 'ALL' || category === 'SHIFTS') {
      const resShift = await prisma.extraShiftEntry.updateMany({
        where: { status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.APPROVED },
      });
      count += resShift.count;
    }

    res.status(200).json({
      message: `Successfully approved ${count} pending item${count === 1 ? '' : 's'}`,
      approvedCount: count,
    });
  } catch (error: any) {
    console.error('approveAllPending error:', error);
    res.status(500).json({ error: 'Failed to approve pending items' });
  }
}

