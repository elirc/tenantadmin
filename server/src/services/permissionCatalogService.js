import { prisma } from '../config/prisma.js';
import { PERMISSION_CATALOG } from '../policies/permissions.js';

export const ensurePermissionCatalog = async (client = prisma) => {
  for (const permission of PERMISSION_CATALOG) {
    await client.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission
    });
  }
};

export const listPermissionCatalog = async () => {
  await ensurePermissionCatalog();

  return prisma.permission.findMany({
    orderBy: { key: 'asc' }
  });
};
