import { prisma } from '../config/prisma.js';

export const findUserByEmail = async (email, client = prisma) => {
  return client.user.findUnique({
    where: { email }
  });
};

export const createUser = async ({ email, name, passwordHash }, client = prisma) => {
  return client.user.create({
    data: {
      email,
      name,
      passwordHash
    }
  });
};

export const listTenantMemberships = async ({
  tenantId,
  search,
  status,
  roleId,
  skip,
  take
}) => {
  const where = {
    tenantId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { email: { contains: search } },
              { name: { contains: search } }
            ]
          }
        }
      : {}),
    ...(roleId
      ? {
          membershipRoles: {
            some: { roleId }
          }
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.membership.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true
          }
        },
        membershipRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystem: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.membership.count({ where })
  ]);

  return { items, total };
};

export const findMembershipById = async ({ tenantId, membershipId }, client = prisma) => {
  return client.membership.findFirst({
    where: {
      id: membershipId,
      tenantId
    },
    include: {
      user: true,
      membershipRoles: true
    }
  });
};

export const createMembershipWithRoles = async (
  { tenantId, userId, status = 'ACTIVE', roleIds = [] },
  client = prisma
) => {
  return client.membership.create({
    data: {
      tenantId,
      userId,
      status,
      ...(roleIds.length > 0
        ? {
            membershipRoles: {
              createMany: {
                data: roleIds.map((roleId) => ({ roleId }))
              }
            }
          }
        : {})
    },
    include: {
      user: true,
      membershipRoles: {
        include: {
          role: true
        }
      }
    }
  });
};

export const updateMembershipAndUser = async (
  { tenantId, membershipId, status, userName },
  client = prisma
) => {
  const membership = await client.membership.findFirst({
    where: {
      id: membershipId,
      tenantId
    },
    include: {
      user: true
    }
  });

  if (!membership) {
    return null;
  }

  if (typeof status === 'string') {
    await client.membership.update({
      where: { id: membership.id },
      data: { status }
    });
  }

  if (typeof userName === 'string') {
    await client.user.update({
      where: { id: membership.userId },
      data: { name: userName }
    });
  }

  return client.membership.findUnique({
    where: { id: membership.id },
    include: {
      user: true,
      membershipRoles: {
        include: {
          role: true
        }
      }
    }
  });
};

export const replaceMembershipRoles = async (
  { tenantId, membershipId, roleIds },
  client = prisma
) => {
  const membership = await client.membership.findFirst({
    where: {
      id: membershipId,
      tenantId
    }
  });

  if (!membership) {
    return null;
  }

  await client.membershipRole.deleteMany({
    where: {
      membershipId: membership.id
    }
  });

  if (roleIds.length > 0) {
    await client.membershipRole.createMany({
      data: roleIds.map((roleId) => ({
        membershipId: membership.id,
        roleId
      }))
    });
  }

  return client.membership.findUnique({
    where: { id: membership.id },
    include: {
      user: true,
      membershipRoles: {
        include: {
          role: true
        }
      }
    }
  });
};
