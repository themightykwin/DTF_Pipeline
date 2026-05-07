/**
 * Seed: create the first admin user.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts \
 *     --email admin@example.com --password MyP@ssword1
 *
 * Or use the npm script:
 *   npm run db:seed -- --email admin@example.com --password MyP@ssword1
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf('--email');
  const passwordIdx = args.indexOf('--password');

  const email = emailIdx !== -1 ? args[emailIdx + 1] : 'admin@dtfpipeline.com';
  const password = passwordIdx !== -1 ? args[passwordIdx + 1] : 'changeme123';

  if (!email || !password) {
    console.error('Usage: --email <email> --password <password>');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: 'Admin', role: 'admin', passwordHash },
    update: { passwordHash },
  });

  console.log(`✓ Admin user ready: ${admin.email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
