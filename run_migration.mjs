import pg from 'pg';
const { Pool } = pg;

async function run() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false } });
    try {
      await pool.query("ALTER TABLE recipes ADD COLUMN updated_at TIMESTAMP");
      console.log("Postgres: column added");
    } catch (e) {
      console.log("Postgres: " + e.message);
    }
    pool.end();
  } else {
    console.log("No postgres url found");
  }
}
run();
