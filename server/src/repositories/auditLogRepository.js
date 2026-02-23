import { prisma } from '../config/prisma.js';

export const listAuditLogsByTenant = async ({
  tenantId,
  action,
  resourceType,
  actorUserId,
  skip,
  take
}) => {
  const where = {
    tenantId,
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(actorUserId ? { actorUserId } : {})
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  return { items, total };
};
