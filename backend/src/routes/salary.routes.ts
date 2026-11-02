import { Router } from 'express';
import {
  getAttendance,
  recordAttendance,
  deleteAttendance,
  getOvertime,
  recordOvertime,
  updateOvertime,
  deleteOvertime,
  approveOvertime,
  rejectOvertime,
  getExtraShifts,
  recordExtraShift,
  updateExtraShift,
  deleteExtraShift,
  approveExtraShift,
  getSalaryRecords,
  generateSalaries,
  markSalaryPaid,
  updateSalaryRecord,
  deleteSalaryRecord,
  getPayslipData,
} from '../controllers/salary.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Attendance
router.get('/attendance', authenticate, getAttendance);
router.post('/attendance', authenticate, requireRole([Role.ADMIN, Role.STAFF]), recordAttendance);
router.delete('/attendance/:id', authenticate, requireRole([Role.ADMIN]), deleteAttendance);

// Overtime
router.get('/overtime', authenticate, getOvertime);
router.post('/overtime', authenticate, recordOvertime);
router.put('/overtime/:id', authenticate, requireRole([Role.ADMIN]), updateOvertime);
router.delete('/overtime/:id', authenticate, requireRole([Role.ADMIN]), deleteOvertime);
router.put('/overtime/:id/approve', authenticate, requireRole([Role.ADMIN]), approveOvertime);
router.put('/overtime/:id/reject', authenticate, requireRole([Role.ADMIN]), rejectOvertime);

// Extra Shifts
router.get('/extra-shifts', authenticate, getExtraShifts);
router.post('/extra-shifts', authenticate, recordExtraShift);
router.put('/extra-shifts/:id', authenticate, requireRole([Role.ADMIN]), updateExtraShift);
router.delete('/extra-shifts/:id', authenticate, requireRole([Role.ADMIN]), deleteExtraShift);
router.put('/extra-shifts/:id/approve', authenticate, requireRole([Role.ADMIN]), approveExtraShift);

// Salary Records & Calculation Engine
router.get('/records', authenticate, getSalaryRecords);
router.post('/generate', authenticate, requireRole([Role.ADMIN, Role.STAFF]), generateSalaries);
router.put('/records/:id', authenticate, requireRole([Role.ADMIN]), updateSalaryRecord);
router.delete('/records/:id', authenticate, requireRole([Role.ADMIN]), deleteSalaryRecord);
router.put('/records/:id/pay', authenticate, requireRole([Role.ADMIN, Role.STAFF]), markSalaryPaid);
router.get('/records/:id/payslip', authenticate, getPayslipData);

export default router;

