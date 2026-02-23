import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg;

const prisma = new PrismaClient();

const permissions = [
  { key: 'users.read', description: 'View users in tenant' },
  { key: 'users.create', description: 'Create users in tenant' },
  { key: 'users.update', description: 'Update users in tenant' },
  { key: 'users.roles.manage', description: 'Assign and remove user roles' },
  { key: 'roles.read', description: 'View roles in tenant' },
  { key: 'roles.manage', description: 'Create/update/delete roles' },
  { key: 'permissions.read', description: 'View permission catalog' },
  { key: 'settings.read', description: 'View tenant settings' },
  { key: 'settings.update', description: 'Update tenant settings' },
  { key: 'audit.read', description: 'View audit logs' }
];

async function main() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission
    });
  }

  console.log(`Seeded ${permissions.length} permissions`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
