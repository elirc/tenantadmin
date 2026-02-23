import { z } from 'zod';
import {
  consumeMagicLink,
  listUserTenants,
  login,
  logout,
  register,
  requestMagicLink,
  switchTenant
} from '../services/authService.js';
import { setSessionCookie, clearSessionCookie } from '../utils/authCookie.js';
import { HttpError } from '../utils/httpError.js';
import { serializeAuthContext } from '../utils/serializers.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(120),
  tenantName: z.string().min(2).max(120),
  tenantSlug: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  tenantSlug: z.string().optional()
});

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().optional()
});

const magicLinkConsumeSchema = z.object({
  token: z.string().min(20)
});

const switchTenantSchema = z.object({
  tenantId: z.string().min(1)
});

const requestMetaFromReq = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

export const registerController = async (req, res) => {
  const payload = registerSchema.parse(req.body);

  const result = await register(payload, requestMetaFromReq(req));

  if (!result.context) {
    throw new HttpError(500, 'Failed to initialize authenticated session');
  }

  setSessionCookie(res, result.token);

  const tenants = await listUserTenants(result.context.user.id);

  return res.status(201).json({
    data: serializeAuthContext(result.context, tenants)
  });
};

export const loginController = async (req, res) => {
  const payload = loginSchema.parse(req.body);

  const result = await login(payload, requestMetaFromReq(req));

  if (!result.context) {
    throw new HttpError(500, 'Failed to initialize authenticated session');
  }

  setSessionCookie(res, result.token);

  const tenants = await listUserTenants(result.context.user.id);

  return res.json({
    data: serializeAuthContext(result.context, tenants)
  });
};

export const requestMagicLinkController = async (req, res) => {
  const payload = magicLinkRequestSchema.parse(req.body);
  const result = await requestMagicLink(payload);

  return res.status(202).json({
    data: result
  });
};

export const consumeMagicLinkController = async (req, res) => {
  const payload = magicLinkConsumeSchema.parse(req.body);
  const result = await consumeMagicLink(payload, requestMetaFromReq(req));

  if (!result.context) {
    throw new HttpError(500, 'Failed to initialize authenticated session');
  }

  setSessionCookie(res, result.token);
  const tenants = await listUserTenants(result.context.user.id);

  return res.json({
    data: serializeAuthContext(result.context, tenants)
  });
};

export const logoutController = async (req, res) => {
  if (req.sessionToken) {
    await logout(req.sessionToken);
  }

  clearSessionCookie(res);

  return res.status(204).send();
};

export const meController = async (req, res) => {
  if (!req.auth) {
    throw new HttpError(401, 'Authentication required');
  }

  const tenants = await listUserTenants(req.auth.user.id);

  return res.json({
    data: serializeAuthContext(req.auth, tenants)
  });
};

export const switchTenantController = async (req, res) => {
  if (!req.auth) {
    throw new HttpError(401, 'Authentication required');
  }

  const payload = switchTenantSchema.parse(req.body);

  await switchTenant({
    authContext: req.auth,
    tenantId: payload.tenantId
  });

  const tenants = await listUserTenants(req.auth.user.id);

  return res.json({
    data: {
      tenants
    }
  });
};
