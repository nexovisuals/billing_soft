import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ApprovalStatus } from '@prisma/client';
import { numberToIndianWords } from '../utils/numberToWords.js';

// Schemas
const attendanceSchema = z.object({
  workerId: z.string().min(1, 'Worker is required'),
  monthYear: z.string().min(1, 'Month-Year is required (e.g. 10-2026)'),
  standardDays: z.number().default(26),
  presentDays: z.number().min(0).max(31),
  absentDays: z.number().min(0).max(31),
  paidLeaves: z.number().min(0).default(0),
  unpaidLeaves: z.number().min(0).default(0),
});

const overtimeSchema = z.object({
  workerId: z.string().min(1, 'Worker is required'),
  otDate: z.string().min(1, 'Date is required'),
  hours: z.number().min(0.5, 'Hours must be at least 0.5'),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  ratePerHour: z.number().optional(),
  remarks: z.string().optional().nullable(),
});

const extraShiftSchema = z.object({
  workerId: z.string().min(1, 'Worker is required'),
  shiftDate: z.string().min(1, 'Date is required'),
  shiftType: z.string().default('Night Shift'),
  amount: z.number().min(0),
  remarks: z.string().optional().nullable(),
});

// Helper: Current Month-Year (e.g. "10-2026")
function getCurrentMonthYear(): string {
  const d = new Date();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${m}-${d.getFullYear()}`;
}

// ────────────────────────────────────────────────────────────
// 1. ATTENDANCE CONTROLLERS
// ────────────────────────────────────────────────────────────

// GET /api/salary/attendance?monthYear=10-2026
export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const monthYear = (req.query.monthYear as string) || getCurrentMonthYear();
    const records = await prisma.attendance.findMany({
      where: { monthYear },
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            monthlySalary: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ records, monthYear });
  } catch (error: any) {
    console.error('getAttendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
}

// POST /api/salary/attendance
export async function recordAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = attendanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { workerId, monthYear, standardDays, presentDays, absentDays, paidLeaves, unpaidLeaves } =
      validation.data;

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    // Upsert attendance for this worker & monthYear
    const existing = await prisma.attendance.findFirst({
      where: { workerId, monthYear },
    });

    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          standardDays,
          presentDays,
          absentDays,
          paidLeaves,
          unpaidLeaves,
          status: ApprovalStatus.APPROVED,
          approvedBy: req.user?.username || 'admin',
        },
        include: {
          worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
        },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          workerId,
          monthYear,
          standardDays,
          presentDays,
          absentDays,
          paidLeaves,
          unpaidLeaves,
          status: ApprovalStatus.APPROVED,
          approvedBy: req.user?.username || 'admin',
        },
        include: {
          worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
        },
      });
    }

    res.status(200).json({
      message: `Attendance for ${record.worker.user.fullName} (${monthYear}) saved`,
      record,
    });
  } catch (error: any) {
    console.error('recordAttendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
}

// DELETE /api/salary/attendance/:id
export async function deleteAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.attendance.delete({ where: { id } });
    res.status(200).json({ message: 'Attendance record deleted successfully' });
  } catch (e: any) {
    console.error('deleteAttendance error:', e);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
}

// ────────────────────────────────────────────────────────────
// 2. OVERTIME CONTROLLERS
// ────────────────────────────────────────────────────────────

// GET /api/salary/overtime
export async function getOvertime(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, workerId } = req.query;
    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as ApprovalStatus;
    }

    if (workerId && typeof workerId === 'string') {
      where.workerId = workerId;
    }

    const entries = await prisma.overtimeEntry.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            overtimeRate: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { otDate: 'desc' },
    });

    res.status(200).json({ entries });
  } catch (error: any) {
    console.error('getOvertime error:', error);
    res.status(500).json({ error: 'Failed to fetch overtime entries' });
  }
}

// POST /api/salary/overtime
export async function recordOvertime(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = overtimeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { workerId, otDate, hours, startTime, endTime, ratePerHour, remarks } = validation.data;

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const applicableRate = ratePerHour || Number(worker.overtimeRate) || 100.0;
    const calculatedAmt = Math.round(hours * applicableRate * 100) / 100;

    const entry = await prisma.overtimeEntry.create({
      data: {
        workerId,
        otDate: new Date(otDate),
        hours,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        calculatedAmt,
        status: req.user?.role === 'ADMIN' ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        remarks: remarks || null,
      },
      include: {
        worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
      },
    });

    res.status(201).json({
      message: `Overtime of ${hours} hrs logged for ${entry.worker.user.fullName}`,
      entry,
    });
  } catch (error: any) {
    console.error('recordOvertime error:', error);
    res.status(500).json({ error: 'Failed to record overtime' });
  }
}

// PUT /api/salary/overtime/:id/approve
export async function approveOvertime(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const entry = await prisma.overtimeEntry.update({
      where: { id },
      data: { status: ApprovalStatus.APPROVED },
      include: {
        worker: { select: { user: { select: { fullName: true } } } },
      },
    });

    res.status(200).json({
      message: `Overtime entry for ${entry.worker.user.fullName} approved`,
      entry,
    });
  } catch (error: any) {
    console.error('approveOvertime error:', error);
    res.status(500).json({ error: 'Failed to approve overtime' });
  }
}

// PUT /api/salary/overtime/:id/reject
export async function rejectOvertime(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const entry = await prisma.overtimeEntry.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        remarks: reason ? `REJECTED: ${reason}` : 'REJECTED',
      },
    });

    res.status(200).json({ message: 'Overtime entry rejected', entry });
  } catch (error: any) {
    console.error('rejectOvertime error:', error);
    res.status(500).json({ error: 'Failed to reject overtime' });
  }
}

// DELETE /api/salary/overtime/:id
export async function deleteOvertime(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.overtimeEntry.delete({ where: { id } });
    res.status(200).json({ message: 'Overtime entry deleted successfully' });
  } catch (e: any) {
    console.error('deleteOvertime error:', e);
    res.status(500).json({ error: 'Failed to delete overtime' });
  }
}

// PUT /api/salary/overtime/:id
export async function updateOvertime(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { otDate, hours, ratePerHour, remarks } = req.body;
    const existing = await prisma.overtimeEntry.findUnique({
      where: { id },
      include: { worker: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Overtime entry not found' });
      return;
    }
    const appliedRate = ratePerHour || Number(existing.worker.overtimeRate) || 100;
    const calculatedAmt = Math.round(Number(hours) * appliedRate * 100) / 100;
    const updated = await prisma.overtimeEntry.update({
      where: { id },
      data: {
        otDate: otDate ? new Date(otDate) : existing.otDate,
        hours: Number(hours),
        calculatedAmt,
        remarks: remarks !== undefined ? remarks : existing.remarks,
      },
    });
    res.status(200).json({ message: 'Overtime entry updated successfully', entry: updated });
  } catch (e: any) {
    console.error('updateOvertime error:', e);
    res.status(500).json({ error: 'Failed to update overtime' });
  }
}

// ────────────────────────────────────────────────────────────
// 3. EXTRA SHIFTS CONTROLLERS
// ────────────────────────────────────────────────────────────

// GET /api/salary/extra-shifts
export async function getExtraShifts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { workerId, status } = req.query;
    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as ApprovalStatus;
    }
    if (workerId && typeof workerId === 'string') {
      where.workerId = workerId;
    }

    const entries = await prisma.extraShiftEntry.findMany({
      where,
      include: {
        worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
      },
      orderBy: { shiftDate: 'desc' },
    });

    res.status(200).json({ entries });
  } catch (error: any) {
    console.error('getExtraShifts error:', error);
    res.status(500).json({ error: 'Failed to fetch extra shift entries' });
  }
}

// POST /api/salary/extra-shifts
export async function recordExtraShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = extraShiftSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { workerId, shiftDate, shiftType, amount, remarks } = validation.data;

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const shiftAmt = amount || Number(worker.extraShiftRate) || 500.0;

    const entry = await prisma.extraShiftEntry.create({
      data: {
        workerId,
        shiftDate: new Date(shiftDate),
        shiftType,
        calculatedAmt: shiftAmt,
        status: req.user?.role === 'ADMIN' ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        remarks: remarks || null,
      },
      include: {
        worker: { select: { employeeId: true, user: { select: { fullName: true } } } },
      },
    });

    res.status(201).json({
      message: `Extra shift logged for ${entry.worker.user.fullName}`,
      entry,
    });
  } catch (error: any) {
    console.error('recordExtraShift error:', error);
    res.status(500).json({ error: 'Failed to record extra shift' });
  }
}

// PUT /api/salary/extra-shifts/:id/approve
export async function approveExtraShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const entry = await prisma.extraShiftEntry.update({
      where: { id },
      data: { status: ApprovalStatus.APPROVED },
      include: { worker: { select: { user: { select: { fullName: true } } } } },
    });
    res.status(200).json({ message: `Extra shift approved for ${entry.worker.user.fullName}`, entry });
  } catch (error: any) {
    console.error('approveExtraShift error:', error);
    res.status(500).json({ error: 'Failed to approve extra shift' });
  }
}

// DELETE /api/salary/extra-shifts/:id
export async function deleteExtraShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.extraShiftEntry.delete({ where: { id } });
    res.status(200).json({ message: 'Extra shift entry deleted successfully' });
  } catch (e: any) {
    console.error('deleteExtraShift error:', e);
    res.status(500).json({ error: 'Failed to delete extra shift' });
  }
}

// PUT /api/salary/extra-shifts/:id
export async function updateExtraShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { shiftDate, shiftType, amount, remarks } = req.body;
    const updated = await prisma.extraShiftEntry.update({
      where: { id },
      data: {
        shiftDate: shiftDate ? new Date(shiftDate) : undefined,
        shiftType: shiftType || undefined,
        calculatedAmt: amount !== undefined ? Number(amount) : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
      },
    });
    res.status(200).json({ message: 'Extra shift entry updated successfully', entry: updated });
  } catch (e: any) {
    console.error('updateExtraShift error:', e);
    res.status(500).json({ error: 'Failed to update extra shift' });
  }
}

// ────────────────────────────────────────────────────────────
// 4. 26-DAY SALARY CALCULATION & PAYSLIP ENGINE
// ────────────────────────────────────────────────────────────

// Helper: Sync & recalculate all salaries for a month
export async function syncSalaryRecordsForMonth(monthYear: string): Promise<any[]> {
  const [mStr, yStr] = monthYear.split('-');
  const mNum = parseInt(mStr, 10);
  const yNum = parseInt(yStr, 10);
  const startDate = new Date(Date.UTC(yNum, mNum - 1, 1, 0, 0, 0, 0));
  const lastDay = new Date(yNum, mNum, 0).getDate();
  const endDate = new Date(Date.UTC(yNum, mNum - 1, lastDay, 23, 59, 59, 999));

  const workers = await prisma.workerProfile.findMany({
    where: { isActive: true },
    include: {
      user: { select: { fullName: true, username: true } },
    },
    orderBy: { employeeId: 'asc' },
  });

  const records: any[] = [];
  for (const worker of workers) {
    const baseSalary = Number(worker.monthlySalary);
    const standardDays = 26;
    const dailyRate = Math.round((baseSalary / standardDays) * 100) / 100;

    // 1. Attendance
    const attendance = await prisma.attendance.findFirst({
      where: { workerId: worker.id, monthYear },
    });
    const absentDays = attendance ? Number(attendance.absentDays) || 0 : 0;
    const absenceDeduct = Math.round(absentDays * dailyRate * 100) / 100;
    const salaryAfterAbsence = Math.max(0, baseSalary - absenceDeduct);

    // 2. Approved Overtime in this month
    const otAgg = await prisma.overtimeEntry.aggregate({
      _sum: { calculatedAmt: true },
      where: {
        workerId: worker.id,
        status: ApprovalStatus.APPROVED,
        otDate: { gte: startDate, lte: endDate },
      },
    });
    const approvedOtAmt = Number(otAgg._sum.calculatedAmt || 0);

    // 3. Approved Extra Shifts in this month
    const shiftAgg = await prisma.extraShiftEntry.aggregate({
      _sum: { calculatedAmt: true },
      where: {
        workerId: worker.id,
        status: ApprovalStatus.APPROVED,
        shiftDate: { gte: startDate, lte: endDate },
      },
    });
    const approvedShiftAmt = Number(shiftAgg._sum.calculatedAmt || 0);

    // 4. Net Salary
    const netSalary = Math.round((salaryAfterAbsence + approvedOtAmt + approvedShiftAmt) * 100) / 100;

    const existingSal = await prisma.salaryRecord.findFirst({
      where: { workerId: worker.id, monthYear },
    });

    let salRecord;
    if (existingSal) {
      salRecord = await prisma.salaryRecord.update({
        where: { id: existingSal.id },
        data: {
          baseSalary,
          absenceDeduct,
          approvedOtAmt,
          approvedShiftAmt,
          netSalary,
        },
        include: {
          worker: {
            select: {
              id: true,
              employeeId: true,
              phoneNumber: true,
              monthlySalary: true,
              user: { select: { fullName: true, username: true } },
            },
          },
        },
      });
    } else {
      salRecord = await prisma.salaryRecord.create({
        data: {
          workerId: worker.id,
          monthYear,
          baseSalary,
          absenceDeduct,
          approvedOtAmt,
          approvedShiftAmt,
          netSalary,
          isPaid: false,
        },
        include: {
          worker: {
            select: {
              id: true,
              employeeId: true,
              phoneNumber: true,
              monthlySalary: true,
              user: { select: { fullName: true, username: true } },
            },
          },
        },
      });
    }
    records.push(salRecord);
  }
  return records;
}

// GET /api/salary/records?monthYear=10-2026
export async function getSalaryRecords(req: AuthRequest, res: Response): Promise<void> {
  try {
    const monthYear = (req.query.monthYear as string) || getCurrentMonthYear();
    const records = await syncSalaryRecordsForMonth(monthYear);

    const totalPayout = records.reduce((sum, r) => sum + Number(r.netSalary), 0);
    const paidCount = records.filter(r => r.isPaid).length;

    res.status(200).json({
      records,
      monthYear,
      summary: {
        totalWorkers: records.length,
        totalPayout,
        paidWorkers: paidCount,
        pendingWorkers: records.length - paidCount,
      },
    });
  } catch (error: any) {
    console.error('getSalaryRecords error:', error);
    res.status(500).json({ error: 'Failed to fetch salary records' });
  }
}

// POST /api/salary/generate
// Calculates 26-day basis salary, deductions, approved OT, extra shifts for all or specific worker
export async function generateSalaries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const monthYear = req.body.monthYear || getCurrentMonthYear();
    const records = await syncSalaryRecordsForMonth(monthYear);

    res.status(200).json({
      message: `Generated 26-day salary records for ${records.length} worker(s) for ${monthYear}`,
      recordsCount: records.length,
      monthYear,
      records,
    });
  } catch (error: any) {
    console.error('generateSalaries error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate salary records' });
  }
}

// PUT /api/salary/records/:id/pay
export async function markSalaryPaid(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const record = await prisma.salaryRecord.update({
      where: { id },
      data: { isPaid: true },
      include: {
        worker: { select: { user: { select: { fullName: true } } } },
      },
    });

    res.status(200).json({
      message: `Salary for ${record.worker.user.fullName} marked as PAID`,
      record,
    });
  } catch (error: any) {
    console.error('markSalaryPaid error:', error);
    res.status(500).json({ error: 'Failed to mark salary as paid' });
  }
}

// GET /api/salary/records/:id/payslip
export async function getPayslipData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const record = await prisma.salaryRecord.findUnique({
      where: { id },
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            phoneNumber: true,
            joiningDate: true,
            user: { select: { fullName: true } },
          },
        },
      },
    });

    if (!record) {
      res.status(404).json({ error: 'Salary record not found' });
      return;
    }

    // Get attendance details
    const attendance = await prisma.attendance.findFirst({
      where: { workerId: record.workerId, monthYear: record.monthYear },
    });

    const netSalaryNum = Number(record.netSalary);
    const amountInWords = numberToIndianWords(netSalaryNum);

    res.status(200).json({
      record,
      attendance: attendance || { standardDays: 26, presentDays: 26, absentDays: 0 },
      amountInWords,
    });
  } catch (error: any) {
    console.error('getPayslipData error:', error);
    res.status(500).json({ error: 'Failed to fetch payslip data' });
  }
}

// PUT /api/salary/records/:id
export async function updateSalaryRecord(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { baseSalary, absenceDeduct, approvedOtAmt, approvedShiftAmt, isPaid } = req.body;
    const existing = await prisma.salaryRecord.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Salary record not found' });
      return;
    }
    const newBase = baseSalary !== undefined ? Number(baseSalary) : Number(existing.baseSalary);
    const newAbsence = absenceDeduct !== undefined ? Number(absenceDeduct) : Number(existing.absenceDeduct);
    const newOt = approvedOtAmt !== undefined ? Number(approvedOtAmt) : Number(existing.approvedOtAmt);
    const newShift = approvedShiftAmt !== undefined ? Number(approvedShiftAmt) : Number(existing.approvedShiftAmt);
    const netSalary = Math.max(0, newBase - newAbsence) + newOt + newShift;

    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: {
        baseSalary: newBase,
        absenceDeduct: newAbsence,
        approvedOtAmt: newOt,
        approvedShiftAmt: newShift,
        netSalary,
        isPaid: isPaid !== undefined ? isPaid : existing.isPaid,
      },
      include: {
        worker: {
          select: {
            id: true,
            employeeId: true,
            phoneNumber: true,
            monthlySalary: true,
            user: { select: { fullName: true, username: true } },
          },
        },
      },
    });
    res.status(200).json({ message: 'Salary record updated successfully', record: updated });
  } catch (error: any) {
    console.error('updateSalaryRecord error:', error);
    res.status(500).json({ error: 'Failed to update salary record' });
  }
}

// DELETE /api/salary/records/:id
export async function deleteSalaryRecord(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.salaryRecord.delete({ where: { id } });
    res.status(200).json({ message: 'Salary record deleted successfully' });
  } catch (error: any) {
    console.error('deleteSalaryRecord error:', error);
    res.status(500).json({ error: 'Failed to delete salary record' });
  }
}

