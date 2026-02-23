import { Router } from 'express';
import {
  createUserController,
  listUsersController,
  replaceRolesController,
  updateUserController
} from '../controllers/usersController.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../policies/permissions.js';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.USERS_READ), listUsersController);
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), createUserController);
router.patch('/:membershipId', requirePermission(PERMISSIONS.USERS_UPDATE), updateUserController);
router.put(
  '/:membershipId/roles',
  requirePermission(PERMISSIONS.USERS_ROLES_MANAGE),
  replaceRolesController
);

export default router;
