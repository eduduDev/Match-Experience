import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed admin user
  const adminEmail = 'nointeligenteoficial@gmail.com';
  const adminPassword = 'u4jg8liZ9jKiNQ7h';
  const hash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hash },
    create: {
      email: adminEmail,
      password: hash,
      name: 'Admin',
      role: 'admin',
    },
  });

  // Seed default event
  await prisma.event.upsert({
    where: { slug: 'evento-principal' },
    update: {},
    create: {
      name: 'Evento Principal',
      slug: 'evento-principal',
      status: 'waiting',
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e: any) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
