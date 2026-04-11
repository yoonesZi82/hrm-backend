import { PrismaClient } from '@prisma/client';
import { seedPermissionsAndRoleAssignments } from '../src/permission/permission-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding started...');
  await seedPermissionsAndRoleAssignments(prisma);
  console.log('🎉 Seeding finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
