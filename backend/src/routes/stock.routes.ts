import { Router } from 'express';
import {
  createRawMaterialReceipt,
  updateRawMaterialReceipt,
  deleteRawMaterialReceipt,
  getRawMaterialReceipts,
  getCompanyLedger,
  getStockSummary,
  recordStockMovement,
} from '../controllers/stock.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/summary', authenticate, getStockSummary);
router.get('/receipts', authenticate, getRawMaterialReceipts);
router.post('/receipts', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createRawMaterialReceipt);
router.put('/receipts/:id', authenticate, requireRole([Role.ADMIN]), updateRawMaterialReceipt);
router.delete('/receipts/:id', authenticate, requireRole([Role.ADMIN]), deleteRawMaterialReceipt);
router.get('/ledger', authenticate, getCompanyLedger);
router.post('/movement', authenticate, requireRole([Role.ADMIN, Role.STAFF]), recordStockMovement);

export default router;

