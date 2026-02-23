import { Router } from 'express';
import authRoutes from './authRoutes.js';
import usersRoutes from './usersRoutes.js';
import rolesRoutes from './rolesRoutes.js';
import permissionsRoutes from './permissionsRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import auditRoutes from './auditRoutes.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/health', (_req, res) => {
  return res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);

router.use(requireAuth);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
