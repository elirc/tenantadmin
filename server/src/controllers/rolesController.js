import { z } from 'zod';
import {
  createTenantRole,
  deleteTenantRole,
  listRoles,
  updateTenantRole
} from '../services/roleService.js';

const createRoleSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
  permissionKeys: z.array(z.string()).default([])
});

const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(240).optional(),
    permissionKeys: z.array(z.string()).optional()
  })
  .refine((value) => value.name || value.description !== undefined || value.permissionKeys, {
    message: 'At least one field is required'
  });

export const listRolesController = async (req, res) => {
  const roles = await listRoles(req.auth.tenant.id);
  return res.json({ data: roles });
};

export const createRoleController = async (req, res) => {
  const payload = createRoleSchema.parse(req.body);

  const role = await createTenantRole({
    tenantId: req.auth.tenant.id,
    actor: req.auth,
    payload
  });

  return res.status(201).json({ data: role });
};

export const updateRoleController = async (req, res) => {
  const payload = updateRoleSchema.parse(req.body);

  const role = await updateTenantRole({
    tenantId: req.auth.tenant.id,
    roleId: req.params.roleId,
    actor: req.auth,
    payload
  });

  return res.json({ data: role });
};

export const deleteRoleController = async (req, res) => {
  await deleteTenantRole({
    tenantId: req.auth.tenant.id,
    roleId: req.params.roleId,
    actor: req.auth
  });

  return res.status(204).send();
};
