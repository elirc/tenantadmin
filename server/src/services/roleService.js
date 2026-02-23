import { prisma } from '../config/prisma.js';
import {
  createRole,
  deleteRole,
  findRoleById,
  listRolesByTenant,
  replaceRolePermissions,
  updateRole
} from '../repositories/roleRepository.js';
import { findPermissionsByKeys } from '../repositories/permissionRepository.js';
import { HttpError } from '../utils/httpError.js';
import { logAuditEvent } from './auditService.js';

const mapRole = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
  permissions: role.rolePermissions.map((entry) => ({
    id: entry.permission.id,
    key: entry.permission.key,
    description: entry.permission.description
  })),
  memberCount: role._count?.membershipRoles ?? 0,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt
});

const resolvePermissionIds = async (permissionKeys, client = prisma) => {
  const permissions = await findPermissionsByKeys(permissionKeys, client);

  if (permissions.length !== permissionKeys.length) {
    throw new HttpError(400, 'One or more permission keys are invalid');
  }

  return permissions.map((permission) => permission.id);
};

export const listRoles = async (tenantId) => {
  const roles = await listRolesByTenant(tenantId);
  return roles.map(mapRole);
};

export const createTenantRole = async ({ tenantId, actor, payload }) => {
  const permissionIds = await resolvePermissionIds(payload.permissionKeys);

  const role = await prisma.$transaction(async (tx) => {
    const createdRole = await createRole(
      {
        tenantId,
        name: payload.name.trim(),
        description: payload.description?.trim() ?? null,
        isSystem: false
      },
      tx
    );

    await replaceRolePermissions({ roleId: createdRole.id, permissionIds }, tx);

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'roles.create',
      resourceType: 'role',
      resourceId: createdRole.id,
      metadata: {
        permissionKeys: payload.permissionKeys
      }
    });

    return tx.role.findUnique({
      where: { id: createdRole.id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            membershipRoles: true
          }
        }
      }
    });
  });

  return mapRole(role);
};

export const updateTenantRole = async ({ tenantId, roleId, actor, payload }) => {
  const existingRole = await findRoleById(tenantId, roleId);

  if (!existingRole) {
    throw new HttpError(404, 'Role not found');
  }

  const updatedRole = await prisma.$transaction(async (tx) => {
    const role = await updateRole(
      {
        tenantId,
        roleId,
        name: payload.name,
        description: payload.description
      },
      tx
    );

    if (!role) {
      throw new HttpError(404, 'Role not found');
    }

    if (Array.isArray(payload.permissionKeys)) {
      const permissionIds = await resolvePermissionIds(payload.permissionKeys, tx);
      await replaceRolePermissions({ roleId, permissionIds }, tx);
    }

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'roles.update',
      resourceType: 'role',
      resourceId: roleId,
      metadata: payload
    });

    return tx.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            membershipRoles: true
          }
        }
      }
    });
  });

  return mapRole(updatedRole);
};

export const deleteTenantRole = async ({ tenantId, roleId, actor }) => {
  const existingRole = await prisma.role.findFirst({
    where: {
      id: roleId,
      tenantId
    },
    include: {
      _count: {
        select: {
          membershipRoles: true
        }
      }
    }
  });

  if (!existingRole) {
    throw new HttpError(404, 'Role not found');
  }

  if (existingRole.isSystem) {
    throw new HttpError(400, 'System roles cannot be deleted');
  }

  if (existingRole._count.membershipRoles > 0) {
    throw new HttpError(400, 'Role is still assigned to tenant members');
  }

  await prisma.$transaction(async (tx) => {
    const deleted = await deleteRole({ tenantId, roleId }, tx);

    if (!deleted) {
      throw new HttpError(404, 'Role not found');
    }

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'roles.delete',
      resourceType: 'role',
      resourceId: roleId
    });
  });
};
