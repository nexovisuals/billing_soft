import { Router } from 'express';
import {
  getPendingApprovals,
  approveAttendanceItem,
  rejectAttendanceItem,
  approveAllPending,
} from '../controllers/approvals.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/pending', authenticate, requireRole([Role.ADMIN, Role.STAFF]), getPendingApprovals);
router.post('/attendance/:id/approve', authenticate, requireRole([Role.ADMIN, Role.STAFF]), approveAttendanceItem);
router.post('/attendance/:id/reject', authenticate, requireRole([Role.ADMIN, Role.STAFF]), rejectAttendanceItem);
router.post('/approve-all', authenticate, requireRole([Role.ADMIN]), approveAllPending);

export default router;

