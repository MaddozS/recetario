import { betterAuth } from "better-auth";
import { Pool } from "pg";
import {
  prepareSqliteDatabasePath,
  usesEphemeralSqliteStorage,
} from "./sqlite-path";

type SqliteDatabaseSync = import("node:sqlite").DatabaseSync;

const googleClientId =
  import.meta.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  import.meta.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const betterAuthUrl =
  import.meta.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL;
const useDatabase =
  (import.meta.env.BETTER_AUTH_USE_DB ||
    process.env.BETTER_AUTH_USE_DB ||
    "true") !== "false";
const databasePath =
  import.meta.env.BETTER_AUTH_DB_PATH ||
  process.env.BETTER_AUTH_DB_PATH ||
  "./data/auth.db";
const postgresUrlRaw =
  import.meta.env.DATABASE_URL ||
  process.env.DATABASE_URL ||
  import.meta.env.POSTGRES_URL ||
  process.env.POSTGRES_URL;
const postgresUrl = postgresUrlRaw?.trim();
const safePostgresUrl = (() => {
  if (!postgresUrl) return undefined;
  try {
    const parsed = new URL(postgresUrl);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      console.warn(
        "DATABASE_URL/POSTGRES_URL has an unsupported protocol. Falling back to local SQLite.",
      );
      return undefined;
    }
    return postgresUrl;
  } catch {
    console.warn(
      "DATABASE_URL/POSTGRES_URL is invalid. If your password has special chars like #, encode them as %23. Falling back to local SQLite.",
    );
    return undefined;
  }
})();
const isLocalDatabaseUrl = safePostgresUrl
  ? /localhost|127\.0\.0\.1/.test(safePostgresUrl)
  : false;
const postgresSslInsecure =
  (import.meta.env.POSTGRES_SSL_INSECURE ||
    process.env.POSTGRES_SSL_INSECURE ||
    "false") === "true";
const postgresSslCa =
  import.meta.env.POSTGRES_SSL_CA || process.env.POSTGRES_SSL_CA;
const postgresSslConfig =
  !safePostgresUrl || isLocalDatabaseUrl
    ? undefined
    : {
        rejectUnauthorized: !postgresSslInsecure,
        ...(postgresSslCa ? { ca: postgresSslCa.replace(/\\n/g, "\n") } : {}),
      };
const vercelUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const trustedOrigins = [
  "http://localhost:4321",
  betterAuthUrl,
  vercelUrl,
].filter((value): value is string => Boolean(value));

const authGlobals = globalThis as typeof globalThis & {
  __betterAuthDb?: SqliteDatabaseSync;
  __betterAuthPgPool?: Pool;
  __betterAuthMigrations?: Promise<void>;
};

const authPostgresPool =
  useDatabase && safePostgresUrl
    ? (authGlobals.__betterAuthPgPool ??= new Pool({
        connectionString: safePostgresUrl,
        ssl: postgresSslConfig,
      }))
    : undefined;

let authSqliteDb: SqliteDatabaseSync | undefined;
if (useDatabase && !authPostgresPool) {
  const { DatabaseSync } = await import("node:sqlite");
  authSqliteDb = authGlobals.__betterAuthDb ??= new DatabaseSync(
    prepareSqliteDatabasePath(databasePath),
  );
}

const authDatabase = authPostgresPool || authSqliteDb;

if (!googleClientId || !googleClientSecret) {
  console.error("Missing Google OAuth credentials. Check your .env file.");
}

if (!safePostgresUrl && usesEphemeralSqliteStorage()) {
  console.warn(
    "DATABASE_URL/POSTGRES_URL is not set on a serverless runtime. Falling back to SQLite under /tmp, which is writable but ephemeral between deployments and cold starts.",
  );
}

export const auth = betterAuth({
  baseURL: betterAuthUrl,
  secret: import.meta.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
  database: authDatabase,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: googleClientId as string,
      clientSecret: googleClientSecret as string,
    },
  },
});

if (authDatabase && !authGlobals.__betterAuthMigrations) {
  authGlobals.__betterAuthMigrations = (async () => {
    const context = await auth.$context;
    try {
      await context.runMigrations();
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "code" in error
          ? (error as { code: string }).code
          : "";
      if (msg === "42P07") {
        console.info("Better Auth tables already exist, skipping migrations.");
      } else {
        console.error("Failed to run Better Auth migrations:", error);
        throw error;
      }
    }
  })();
}
