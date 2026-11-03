import { Router } from 'express';
import {
  submitDailyWork,
  getDailyWork,
  updateDailyWork,
  deleteDailyWork,
  approveDailyWork,
  rejectDailyWork,
  getWorkerProfiles,
  createWorkerProfile,
  updateWorkerProfile,
  deleteWorkerProfile,
  getProductionSummary,
  submitWorkerAttendance,
  getWorkerAttendance,
} from '../controllers/worker.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Work submissions & retrieval
router.post('/daily-work', authenticate, submitDailyWork);
router.get('/daily-work', authenticate, getDailyWork);
router.put('/daily-work/:id', authenticate, requireRole([Role.ADMIN]), updateDailyWork);
router.delete('/daily-work/:id', authenticate, requireRole([Role.ADMIN]), deleteDailyWork);

// Attendance submissions & history
router.post('/attendance', authenticate, submitWorkerAttendance);
router.get('/attendance', authenticate, getWorkerAttendance);

// Production summary metrics
router.get('/production/summary', authenticate, getProductionSummary);

// Admin & Staff Approval Gate
router.put('/daily-work/:id/approve', authenticate, requireRole([Role.ADMIN, Role.STAFF]), approveDailyWork);
router.put('/daily-work/:id/reject', authenticate, requireRole([Role.ADMIN, Role.STAFF]), rejectDailyWork);

// Worker Profiles Management
router.get('/profiles', authenticate, requireRole([Role.ADMIN, Role.STAFF]), getWorkerProfiles);
router.post('/profiles', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createWorkerProfile);
router.put('/profiles/:id', authenticate, requireRole([Role.ADMIN]), updateWorkerProfile);
router.delete('/profiles/:id', authenticate, requireRole([Role.ADMIN]), deleteWorkerProfile);

export default router;
