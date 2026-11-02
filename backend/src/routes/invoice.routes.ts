import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  getNextNumber,
  getPendingDCs,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  cancelInvoice,
} from '../controllers/invoice.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/next-number', authenticate, getNextNumber);
router.get('/pending-dcs', authenticate, getPendingDCs);
router.get('/', authenticate, getInvoices);
router.get('/:id', authenticate, getInvoiceById);
router.post('/', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createInvoice);
router.put('/:id', authenticate, requireRole([Role.ADMIN]), updateInvoice);
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), deleteInvoice);
router.put('/:id/cancel', authenticate, requireRole([Role.ADMIN]), cancelInvoice);

export default router;

