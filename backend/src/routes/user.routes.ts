import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getNotifications,
} from '../controllers/user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Workable notifications (authenticated users)
router.get('/notifications', authenticate, getNotifications);

// Admin-only User & Staff Account Management
router.get('/', authenticate, requireRole([Role.ADMIN]), getUsers);
router.post('/', authenticate, requireRole([Role.ADMIN]), createUser);
router.put('/:id', authenticate, requireRole([Role.ADMIN]), updateUser);
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), deleteUser);

export default router;

