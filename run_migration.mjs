import pg from "pg";
const { Pool } = pg;

async function run() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const isLocalUrl = /localhost|127\.0\.0\.1/.test(url);
    const ssl = isLocalUrl
      ? undefined
      : {
          rejectUnauthorized: process.env.POSTGRES_SSL_INSECURE !== "true",
          ...(process.env.POSTGRES_SSL_CA
            ? { ca: process.env.POSTGRES_SSL_CA.replace(/\\n/g, "\n") }
            : {}),
        };
    const pool = new Pool({ connectionString: url, ssl });
    try {
      await pool.query(
        "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ",
      );
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
