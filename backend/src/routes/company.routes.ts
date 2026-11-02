import { Router } from 'express';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getCompanies);
router.post('/', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createCompany);
router.put('/:id', authenticate, requireRole([Role.ADMIN]), updateCompany);
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), deleteCompany);

export default router;

