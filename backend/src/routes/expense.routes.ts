import { Router } from 'express';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getOtherExpenses,
  createOtherExpense,
  updateOtherExpense,
  deleteOtherExpense,
  getExpenseSummary,
} from '../controllers/expense.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/summary', authenticate, getExpenseSummary);

// Purchases
router.get('/purchases', authenticate, getPurchases);
router.post('/purchases', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createPurchase);
router.put('/purchases/:id', authenticate, requireRole([Role.ADMIN]), updatePurchase);
router.delete('/purchases/:id', authenticate, requireRole([Role.ADMIN]), deletePurchase);

// Operating Expenses
router.get('/operating', authenticate, getOtherExpenses);
router.post('/operating', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createOtherExpense);
router.put('/operating/:id', authenticate, requireRole([Role.ADMIN]), updateOtherExpense);
router.delete('/operating/:id', authenticate, requireRole([Role.ADMIN]), deleteOtherExpense);

export default router;

