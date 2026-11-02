import { Router } from 'express';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '../controllers/material.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getMaterials);
router.post('/', authenticate, requireRole([Role.ADMIN, Role.STAFF]), createMaterial);
router.put('/:id', authenticate, requireRole([Role.ADMIN]), updateMaterial);
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), deleteMaterial);

export default router;

