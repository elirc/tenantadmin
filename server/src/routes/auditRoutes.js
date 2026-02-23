import { Router } from 'express';
import { listAuditLogsController } from '../controllers/auditController.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../policies/permissions.js';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.AUDIT_READ), listAuditLogsController);

export default router;
