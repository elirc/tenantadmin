import { prisma } from '../config/prisma.js';

export const listPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: {
      key: 'asc'
    }
  });
};

export const findPermissionsByKeys = async (keys, client = prisma) => {
  return client.permission.findMany({
    where: {
      key: {
        in: keys
      }
    }
  });
};
