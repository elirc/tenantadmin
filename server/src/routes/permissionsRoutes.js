import { Router } from 'express';
import { listPermissionsController } from '../controllers/permissionsController.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../policies/permissions.js';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PERMISSIONS_READ), listPermissionsController);

export default router;
