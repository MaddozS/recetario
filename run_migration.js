import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';

loadEnv();

async function run() {
  const isPostgres = process.env.USE_DATABASE === 'true' && process.env.POSTGRES_URL;
  if (isPostgres) {
    const isLocalUrl = /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL);
    const ssl = isLocalUrl
      ? undefined
      : {
          rejectUnauthorized: process.env.POSTGRES_SSL_INSECURE !== 'true',
          ...(process.env.POSTGRES_SSL_CA ? { ca: process.env.POSTGRES_SSL_CA.replace(/\\n/g, '\n') } : {}),
        };
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl });
    try {
      await pool.query("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ");
      console.log("Postgres: column added");
    } catch (e) {
      console.log("Postgres: " + e.message);
    }
    pool.end();
  } else {
    const db = new DatabaseSync(path.resolve(process.cwd(), process.env.DATABASE_PATH || "data/database.sqlite"));
    try {
      db.exec("ALTER TABLE recipes ADD COLUMN updated_at TEXT");
      console.log("SQLite: column added");
    } catch (e) {
      console.log("SQLite: " + e.message);
    }
    db.close();
  }
}
run();
