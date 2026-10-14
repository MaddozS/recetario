import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient } from '../prisma/generated-node/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaNeon({
  connectionString,
});

export const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Performing CRUD operations with Neon & Prisma ORM...');

  const testId = `test-${Date.now()}`;
  const testEmail = `alice-${Date.now()}@example.com`;

  // CREATE
  const newUser = await prisma.user.create({
    data: {
      id: testId,
      name: 'Alice Smith',
      firstName: 'Alice',
      lastName: 'Smith',
      email: testEmail,
      emailVerified: true,
    },
  });
  console.log('✅ CREATE: New user created:', {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
  });

  // READ
  const foundUser = await prisma.user.findUnique({
    where: { id: newUser.id },
  });
  console.log('✅ READ: Found user:', {
    id: foundUser?.id,
    name: foundUser?.name,
    email: foundUser?.email,
  });

  // UPDATE
  const updatedUser = await prisma.user.update({
    where: { id: newUser.id },
    data: { name: 'Alice Cooper' },
  });
  console.log('✅ UPDATE: User updated:', {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
  });

  // DELETE
  await prisma.user.delete({ where: { id: newUser.id } });
  console.log('✅ DELETE: User deleted successfully.');

  console.log('\n🎉 CRUD operations completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
