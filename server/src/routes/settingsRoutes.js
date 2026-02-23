import { Router } from 'express';
import { listSettingsController, updateSettingController } from '../controllers/settingsController.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../policies/permissions.js';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SETTINGS_READ), listSettingsController);
router.put('/:key', requirePermission(PERMISSIONS.SETTINGS_UPDATE), updateSettingController);

export default router;
