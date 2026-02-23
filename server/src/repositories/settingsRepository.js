import { prisma } from '../config/prisma.js';

export const listTenantSettings = async (tenantId) => {
  return prisma.tenantSetting.findMany({
    where: { tenantId },
    include: {
      updatedByUser: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      key: 'asc'
    }
  });
};

export const upsertTenantSetting = async (
  { tenantId, key, value, updatedByUserId },
  client = prisma
) => {
  return client.tenantSetting.upsert({
    where: {
      tenantId_key: {
        tenantId,
        key
      }
    },
    create: {
      tenantId,
      key,
      value,
      updatedByUserId
    },
    update: {
      value,
      updatedByUserId
    }
  });
};
