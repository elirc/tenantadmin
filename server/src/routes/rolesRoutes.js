import { Router } from 'express';
import {
  createRoleController,
  deleteRoleController,
  listRolesController,
  updateRoleController
} from '../controllers/rolesController.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../policies/permissions.js';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.ROLES_READ), listRolesController);
router.post('/', requirePermission(PERMISSIONS.ROLES_MANAGE), createRoleController);
router.patch('/:roleId', requirePermission(PERMISSIONS.ROLES_MANAGE), updateRoleController);
router.delete('/:roleId', requirePermission(PERMISSIONS.ROLES_MANAGE), deleteRoleController);

export default router;
