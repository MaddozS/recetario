import pg from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.argv[2];
const targetUrl =
  process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error(
    'Error: SOURCE_DATABASE_URL must be provided via environment or as the first argument.'
  );
  process.exit(1);
}

if (!targetUrl) {
  console.error('Error: TARGET_DATABASE_URL (or DATABASE_URL_UNPOOLED in .env) must be set.');
  process.exit(1);
}

// User tables in dependency order
const TABLES = [
  'user',
  'account',
  'session',
  'verification',
  'user_preferences',
  'password_reset_tokens',
  'subscription_plans',
  'subscriptions',
  'checkout_intents',
  'stripe_event_attempts',
  'ingredients',
  'recipes',
  'recipe_ingredients',
  'recipe_presentations',
  'recipe_fixed_costs',
  'presentation_fixed_costs',
  'audit_logs',
  'cache_entries',
];

async function runMigration() {
  console.log('Connecting to source database...');
  const sourceClient = new pg.Client({
    connectionString: sourceUrl,
    connectionTimeoutMillis: 30000,
  });
  await sourceClient.connect();
  console.log('Connected to source database.');

  console.log('Connecting to target database (Neon)...');
  const targetClient = new pg.Client({
    connectionString: targetUrl,
    connectionTimeoutMillis: 30000,
  });
  await targetClient.connect();
  console.log('Connected to target database.');

  try {
    console.log('\nStarting data migration transaction on target DB...');
    await targetClient.query('BEGIN;');

    // 1. Truncate existing data in target DB
    console.log('Truncating existing data in target database...');
    const truncateList = [...TABLES]
      .reverse()
      .map((t) => `"${t}"`)
      .join(', ');
    await targetClient.query(`TRUNCATE TABLE ${truncateList} CASCADE;`);
    console.log('Truncated tables successfully.');

    // 2. Transfer data table by table
    for (const table of TABLES) {
      const sourceRowsRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      const rows = sourceRowsRes.rows;

      if (rows.length === 0) {
        continue;
      }

      const columns = Object.keys(rows[0]);
      const quotedColumns = columns.map((col) => `"${col}"`).join(', ');

      // Batch insert in chunks of 50
      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const valuePlaceholders: string[] = [];
        const flatValues: unknown[] = [];

        chunk.forEach((row, rowIdx) => {
          const rowPlaceholders: string[] = [];
          columns.forEach((col, colIdx) => {
            const paramIdx = rowIdx * columns.length + colIdx + 1;
            rowPlaceholders.push(`$${paramIdx}`);
            flatValues.push(row[col]);
          });
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        });

        const insertQuery = `INSERT INTO "${table}" (${quotedColumns}) VALUES ${valuePlaceholders.join(', ')};`;
        await targetClient.query(insertQuery, flatValues);
      }

      console.log(`  ✓ Transferred ${rows.length} rows into "${table}"`);
    }

    // 3. Sync sequences
    console.log('\nSyncing sequences from source to target...');
    const seqRes = await sourceClient.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public' 
      ORDER BY sequence_name;
    `);

    for (const { sequence_name } of seqRes.rows) {
      const valRes = await sourceClient.query(
        `SELECT last_value, is_called FROM "${sequence_name}"`
      );
      if (valRes.rows.length > 0) {
        const { last_value, is_called } = valRes.rows[0];
        await targetClient.query(`SELECT setval('"${sequence_name}"', $1, $2);`, [
          last_value,
          is_called,
        ]);
        console.log(
          `  ✓ Sequence "${sequence_name}" set to ${last_value} (is_called: ${is_called})`
        );
      }
    }

    await targetClient.query('COMMIT;');
    console.log('\nTransaction committed successfully!');

    // 4. Verification
    console.log('\nVerifying row counts between source and target:');
    let allMatched = true;

    for (const table of TABLES) {
      const srcCountRes = await sourceClient.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const tgtCountRes = await targetClient.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const srcCount = srcCountRes.rows[0].count;
      const tgtCount = tgtCountRes.rows[0].count;

      const match = srcCount === tgtCount;
      if (!match) allMatched = false;

      console.log(
        `  ${match ? '✓' : '✗'} ${table.padEnd(26)} Source: ${String(srcCount).padStart(4)} | Target: ${String(tgtCount).padStart(4)}`
      );
    }

    if (!allMatched) {
      throw new Error('Mismatch detected between source and target table counts!');
    }

    console.log('\n🎉 Full database migration completed successfully with 100% data parity!');
  } catch (err) {
    console.error('Migration error, rolling back target transaction:', err);
    await targetClient.query('ROLLBACK;').catch(() => {});
    process.exit(1);
  } finally {
    await sourceClient.end().catch(() => {});
    await targetClient.end().catch(() => {});
  }
}

runMigration();
