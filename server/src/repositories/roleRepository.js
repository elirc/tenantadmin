import { prisma } from '../config/prisma.js';

export const findRolesByIds = async (tenantId, roleIds) => {
  return prisma.role.findMany({
    where: {
      tenantId,
      id: {
        in: roleIds
      }
    }
  });
};

export const listRolesByTenant = async (tenantId) => {
  return prisma.role.findMany({
    where: { tenantId },
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
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
  });
};

export const findRoleById = async (tenantId, roleId) => {
  return prisma.role.findFirst({
    where: {
      id: roleId,
      tenantId
    },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });
};

export const createRole = async ({ tenantId, name, description, isSystem = false }, client = prisma) => {
  return client.role.create({
    data: {
      tenantId,
      name,
      description,
      isSystem
    }
  });
};

export const replaceRolePermissions = async ({ roleId, permissionIds }, client = prisma) => {
  await client.rolePermission.deleteMany({
    where: {
      roleId
    }
  });

  if (permissionIds.length > 0) {
    await client.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId }))
    });
  }
};

export const updateRole = async ({ tenantId, roleId, name, description }, client = prisma) => {
  const role = await client.role.findFirst({
    where: {
      id: roleId,
      tenantId
    }
  });

  if (!role) {
    return null;
  }

  return client.role.update({
    where: { id: roleId },
    data: {
      ...(name ? { name } : {}),
      ...(typeof description === 'string' ? { description } : {})
    }
  });
};

export const deleteRole = async ({ tenantId, roleId }, client = prisma) => {
  const role = await client.role.findFirst({
    where: {
      id: roleId,
      tenantId
    }
  });

  if (!role) {
    return null;
  }

  return client.role.delete({
    where: {
      id: roleId
    }
  });
};
