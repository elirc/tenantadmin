import { Router } from 'express';
import {
  consumeMagicLinkController,
  loginController,
  logoutController,
  meController,
  registerController,
  requestMagicLinkController,
  switchTenantController
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/magic-link/request', requestMagicLinkController);
router.post('/magic-link/consume', consumeMagicLinkController);
router.post('/logout', logoutController);
router.get('/me', requireAuth, meController);
router.post('/switch-tenant', requireAuth, switchTenantController);

export default router;
