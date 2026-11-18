/**
 * Utilidad de QA: crea/verifica usuarios de prueba para desarrollo local.
 *
 * Crea el usuario vía el endpoint de sign-up de Better Auth (para que quede
 * la `account` con password hash y el login funcione) y luego lo marca como
 * verificado + asigna suscripción directo en BD.
 *
 * Uso:
 *   pnpm --filter @recetario/db exec tsx prisma/seed-test-users.ts \
 *     --email qa@example.com --password Temporal123! --plan pro_monthly
 *
 * Sin argumentos: marca como verificados todos los usuarios cuyo email
 * contenga "qa-temp-" (los creados durante testing manual).
 *
 * Flags:
 *   --email <email>       Email del usuario de prueba (default: qa-temp-<timestamp>@example.com)
 *   --password <pass>     Contraseña (default: Temporal123!)
 *   --name <nombre>       Nombre completo (default: "QA Temporal")
 *   --plan <id>           Plan de suscripción a asignar (default: ninguno).
 *                         Válidos: basic_monthly | basic_yearly | pro_monthly | pro_yearly
 *   --api <url>           Base del API para sign-up (default: http://localhost:8787)
 *   --verify-only         Solo marca emailVerified=true, no crea usuario
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient } from './generated-node/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL environment variable is not set');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const emailArg = flag('email');
const passwordArg = flag('password');
const nameArg = flag('name');
const planArg = flag('plan');
const apiBase = flag('api') ?? 'http://localhost:8787';
const verifyOnly = args.includes('--verify-only');

const email = emailArg ?? `qa-temp-${Date.now()}@example.com`;
const password = passwordArg ?? 'Temporal123!';
const name = nameArg ?? 'QA Temporal';
const [firstName = 'QA', lastName = 'Temporal'] = name.split(/\s+/);

// 1. Marcar verificados los usuarios QA existentes (si los hay)
const qaUsers = await prisma.user.findMany({
  where: { email: { contains: 'qa-temp-' } },
  select: { id: true, email: true, emailVerified: true },
});
for (const u of qaUsers) {
  if (!u.emailVerified) {
    await prisma.user.update({ where: { id: u.id }, data: { emailVerified: true } });
    console.log(`✔ Verificado: ${u.email}`);
  } else {
    console.log(`• Ya verificado: ${u.email}`);
  }
}

// 2. Crear el usuario si no existe (vía sign-up de Better Auth, que crea la
//    account con password hash y hace que el login funcione)
let userId: string | undefined;
if (!verifyOnly) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Usuario ya existe: ${email}${existing.emailVerified ? ' (verificado)' : ''}`);
    userId = existing.id;
  } else {
    const res = await fetch(`${apiBase}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:4321',
      },
      body: JSON.stringify({
        name,
        firstName,
        lastName,
        email,
        password,
      }),
    });
    const body = (await res.json()) as { user?: { id?: string }; message?: string };
    if (!res.ok || !body.user?.id) {
      console.log(`✖ Sign-up falló (${res.status}): ${body.message ?? 'respuesta sin user.id'}`);
      console.log('   ¿Está corriendo el API en ' + apiBase + '? (pnpm dev)');
    } else {
      userId = body.user.id;
      console.log(`✔ Creado: ${email}`);
    }
  }

  // 2b. Marcar verificado (el sign-up crea el usuario con emailVerified=false
  //     y el email de verificación falla con dominios de prueba)
  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  }
}

// 3. Asignar suscripción si se pidió --plan
if (planArg && userId) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planArg } });
  if (!plan) {
    console.log(
      `✖ Plan "${planArg}" no existe. Válidos: basic_monthly | basic_yearly | pro_monthly | pro_yearly`
    );
  } else {
    await prisma.subscription.upsert({
      where: { id: `qa-sub-${userId}` },
      update: { planId: planArg, status: 'active' },
      create: { id: `qa-sub-${userId}`, userId, planId: planArg, status: 'active' },
    });
    console.log(`✔ Suscripción ${planArg} (active) asignada a ${email}`);
  }
}

if (userId) {
  console.log(`\nCuenta de prueba: ${email} / ${password}`);
} else {
  console.log('\nNo se pudo crear el usuario de prueba.');
}
await prisma.$disconnect();
