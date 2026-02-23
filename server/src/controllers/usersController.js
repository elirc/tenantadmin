import { z } from 'zod';
import {
  createTenantUser,
  listUsers,
  replaceTenantUserRoles,
  updateTenantUser
} from '../services/userService.js';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(100),
  roleIds: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INVITED']).optional()
});

const updateUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'INVITED']).optional()
  })
  .refine((value) => value.name || value.status, {
    message: 'At least one field is required'
  });

const replaceRolesSchema = z.object({
  roleIds: z.array(z.string())
});

export const listUsersController = async (req, res) => {
  const result = await listUsers({
    tenantId: req.auth.tenant.id,
    query: req.query
  });

  return res.json({ data: result.items, meta: result.meta });
};

export const createUserController = async (req, res) => {
  const payload = createUserSchema.parse(req.body);

  const user = await createTenantUser({
    tenantId: req.auth.tenant.id,
    actor: req.auth,
    payload
  });

  return res.status(201).json({ data: user });
};

export const updateUserController = async (req, res) => {
  const payload = updateUserSchema.parse(req.body);

  const user = await updateTenantUser({
    tenantId: req.auth.tenant.id,
    membershipId: req.params.membershipId,
    actor: req.auth,
    payload
  });

  return res.json({ data: user });
};

export const replaceRolesController = async (req, res) => {
  const payload = replaceRolesSchema.parse(req.body);

  const user = await replaceTenantUserRoles({
    tenantId: req.auth.tenant.id,
    membershipId: req.params.membershipId,
    actor: req.auth,
    roleIds: payload.roleIds
  });

  return res.json({ data: user });
};
