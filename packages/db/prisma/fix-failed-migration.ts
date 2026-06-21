import "dotenv/config";
import pg from "pg";

const MIGRATION_NAME = "20260527070542_add_first_last_name";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const migrationTableExists = await tableExists(pool, "_prisma_migrations");
    if (!migrationTableExists) {
      console.log("_prisma_migrations table not found. Nothing to fix.");
      return;
    }

    const migration = await pool.query(
      `SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = $1`,
      [MIGRATION_NAME],
    );

    if (migration.rows.length === 0) {
      console.log(`Migration ${MIGRATION_NAME} not found in _prisma_migrations. Nothing to fix.`);
      return;
    }

    const record = migration.rows[0];
    if (record.finished_at !== null) {
      console.log(`Migration ${MIGRATION_NAME} already applied successfully. Nothing to fix.`);
      return;
    }

    if (record.rolled_back_at !== null) {
      console.error(`Migration ${MIGRATION_NAME} was rolled back. Cannot auto-fix.`);
      process.exit(1);
    }

    console.log(`Migration ${MIGRATION_NAME} is in failed state. Diagnosing DB state...`);

    const hasFirstName = await columnExists(pool, "user", "first_name");
    const hasLastName = await columnExists(pool, "user", "last_name");
    const hasRole = await columnExists(pool, "user", "role");
    const hasRateLimitTable = await tableExists(pool, "rate_limit_entries");
    const hasCacheTable = await tableExists(pool, "cache_entries");
    const hasAuditTable = await tableExists(pool, "audit_logs");
    const hasRoleEnum = await enumExists(pool, "Role");
    const hasAuditEnum = await enumExists(pool, "AuditAction");

    console.log(`  user.first_name:     ${hasFirstName}`);
    console.log(`  user.last_name:      ${hasLastName}`);
    console.log(`  user.role:           ${hasRole}`);
    console.log(`  rate_limit_entries:  ${hasRateLimitTable}`);
    console.log(`  cache_entries:       ${hasCacheTable}`);
    console.log(`  audit_logs:          ${hasAuditTable}`);
    console.log(`  Role enum:           ${hasRoleEnum}`);
    console.log(`  AuditAction enum:    ${hasAuditEnum}`);

    if (!hasRoleEnum) {
      console.log("Creating Role enum...");
      await pool.query(`CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR')`);
    }

    if (!hasAuditEnum) {
      console.log("Creating AuditAction enum...");
      await pool.query(
        `CREATE TYPE "AuditAction" AS ENUM ('sign_in', 'sign_up', 'password_change', 'email_change', 'account_delete', 'session_revoke')`,
      );
    }

    if (!hasFirstName || !hasLastName) {
      console.log("Adding first_name/last_name columns (nullable first)...");
      if (!hasFirstName) {
        await pool.query(`ALTER TABLE "user" ADD COLUMN "first_name" TEXT`);
      }
      if (!hasLastName) {
        await pool.query(`ALTER TABLE "user" ADD COLUMN "last_name" TEXT`);
      }

      console.log("Backfilling first_name/last_name from name column...");
      await pool.query(`
        UPDATE "user" SET
          "first_name" = COALESCE(NULLIF(SPLIT_PART("name", ' ', 1), ''), 'User'),
          "last_name"  = COALESCE(NULLIF(REGEXP_REPLACE("name", '^\\S+\\s*', ''), ''), '')
        WHERE "first_name" IS NULL OR "last_name" IS NULL
      `);

      console.log("Setting first_name/last_name to NOT NULL...");
      await pool.query(`ALTER TABLE "user" ALTER COLUMN "first_name" SET NOT NULL`);
      await pool.query(`ALTER TABLE "user" ALTER COLUMN "last_name" SET NOT NULL`);
    }

    if (!hasRole) {
      console.log("Adding role column...");
      await pool.query(`ALTER TABLE "user" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER'`);
    }

    if (!hasRateLimitTable) {
      console.log("Creating rate_limit_entries table...");
      await pool.query(`
        CREATE TABLE "rate_limit_entries" (
          "id" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "count" INTEGER NOT NULL DEFAULT 0,
          "reset_at" BIGINT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id")
        )
      `);
      await pool.query(
        `CREATE UNIQUE INDEX "rate_limit_entries_key_key" ON "rate_limit_entries"("key")`,
      );
    }

    if (!hasCacheTable) {
      console.log("Creating cache_entries table...");
      await pool.query(`
        CREATE TABLE "cache_entries" (
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "expires_at" BIGINT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "cache_entries_pkey" PRIMARY KEY ("key")
        )
      `);
    }

    if (!hasAuditTable) {
      console.log("Creating audit_logs table...");
      await pool.query(`
        CREATE TABLE "audit_logs" (
          "id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "action" "AuditAction" NOT NULL,
          "ip_address" TEXT,
          "user_agent" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
        )
      `);
      await pool.query(
        `CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at")`,
      );
    }

    console.log("Marking migration as resolved...");
    await pool.query(
      `UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1 WHERE migration_name = $1`,
      [MIGRATION_NAME],
    );

    console.log("Done. Migration fixed successfully.");
  } catch (error) {
    console.error("Fix failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function columnExists(
  pool: pg.Pool,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    ) as exists`,
    [table, column],
  );
  return result.rows[0].exists;
}

async function tableExists(pool: pg.Pool, table: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = $1 AND table_schema = 'public'
    ) as exists`,
    [table],
  );
  return result.rows[0].exists;
}

async function enumExists(pool: pg.Pool, enumName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = $1
    ) as exists`,
    [enumName],
  );
  return result.rows[0].exists;
}

main();
