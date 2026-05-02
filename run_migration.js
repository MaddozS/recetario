import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';

loadEnv();

async function run() {
  const isPostgres = process.env.USE_DATABASE === 'true' && process.env.POSTGRES_URL;
  if (isPostgres) {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: process.env.POSTGRES_URL.includes('localhost') ? undefined : { rejectUnauthorized: false } });
    try {
      await pool.query("ALTER TABLE recipes ADD COLUMN updated_at TIMESTAMP");
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
