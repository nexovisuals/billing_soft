import { Router } from 'express';
import { getPayments, recordPayment, updatePayment, deletePayment } from '../controllers/payment.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getPayments);
router.post('/', authenticate, requireRole([Role.ADMIN, Role.STAFF]), recordPayment);
router.put('/:id', authenticate, requireRole([Role.ADMIN]), updatePayment);
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), deletePayment);

export default router;

