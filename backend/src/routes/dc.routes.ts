import { Router } from 'express';
import {
  getDeliveryChallans,
  getDeliveryChallanById,
  getNextNumber,
  createDeliveryChallan,
  updateDeliveryChallan,
  cancelDeliveryChallan,
} from '../controllers/dc.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/next-number', authenticate, getNextNumber);
router.get('/', authenticate, getDeliveryChallans);
router.get('/:id', authenticate, getDeliveryChallanById);
router.post('/', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createDeliveryChallan);
router.put('/:id', authenticate, requireRole([Role.ADMIN]), updateDeliveryChallan);
router.put('/:id/cancel', authenticate, requireRole([Role.ADMIN]), cancelDeliveryChallan);

export default router;

