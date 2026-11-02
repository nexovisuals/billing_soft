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
} from '../controllers/worker.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Work submissions & retrieval
router.post('/daily-work', authenticate, submitDailyWork);
router.get('/daily-work', authenticate, getDailyWork);
router.put('/daily-work/:id', authenticate, requireRole([Role.ADMIN]), updateDailyWork);
router.delete('/daily-work/:id', authenticate, requireRole([Role.ADMIN]), deleteDailyWork);

// Production summary metrics
router.get('/production/summary', authenticate, getProductionSummary);

// Admin Approval Gate
router.put('/daily-work/:id/approve', authenticate, requireRole([Role.ADMIN]), approveDailyWork);
router.put('/daily-work/:id/reject', authenticate, requireRole([Role.ADMIN]), rejectDailyWork);

// Worker Profiles Management
router.get('/profiles', authenticate, requireRole([Role.ADMIN, Role.STAFF]), getWorkerProfiles);
router.post('/profiles', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createWorkerProfile);
router.put('/profiles/:id', authenticate, requireRole([Role.ADMIN]), updateWorkerProfile);
router.delete('/profiles/:id', authenticate, requireRole([Role.ADMIN]), deleteWorkerProfile);

export default router;
