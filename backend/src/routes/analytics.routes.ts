import { Router } from 'express';
import {
  getDashboardAnalytics,
  exportInvoicesCsv,
  exportStockCsv,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/dashboard', authenticate, getDashboardAnalytics);
router.get('/export/invoices-csv', authenticate, exportInvoicesCsv);
router.get('/export/stock-csv', authenticate, exportStockCsv);

export default router;

