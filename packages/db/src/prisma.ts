import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

// El cliente vive lo que dura el request: con `PrismaPg` el cliente posee
// sockets TCP, y en workerd esos sockets están atados al request que los abrió.
// `withPrismaContext` envuelve la petición y le da a `prisma` su instancia.
const clientStorage = new AsyncLocalStorage<PrismaClient>();

function createPrismaClientInternal(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 10000,
    }),
  });
}

export async function withPrismaContext<T>(fn: () => Promise<T>): Promise<T> {
  const client = createPrismaClientInternal();
  try {
    return await clientStorage.run(client, fn);
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

export function getPrisma(): PrismaClient {
  const client = clientStorage.getStore();
  if (!client) {
    throw new Error('prisma se usó fuera del contexto de un request: falta withPrismaContext()');
  }
  return client;
}

/**
 * Proxy perezoso: no resuelve el cliente hasta que se invoca el método, así que
 * capturarlo al cargar un módulo (p. ej. `prismaAdapter(prisma, …)`) es seguro.
 */
function lazy(path: string[]): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      // Nunca debe comportarse como thenable: `await prisma.user` colgaría.
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      return lazy([...path, String(prop)]);
    },
    apply(_target, _this, args) {
      const client = getPrisma() as unknown as Record<string, unknown>;
      const parent = path
        .slice(0, -1)
        .reduce<Record<string, unknown>>((acc, key) => acc[key] as Record<string, unknown>, client);
      const method = parent?.[path[path.length - 1] as string];
      if (typeof method !== 'function') {
        throw new Error(`prisma.${path.join('.')} no es una función`);
      }
      return (method as (...a: unknown[]) => unknown).apply(parent, args);
    },
  });
}

export const prisma = lazy([]) as PrismaClient;
