/**
 * DATABASE MIGRATION SCRIPT
 * Copies ALL data from old Hostinger DB → new Hostinger DB
 *
 * OLD: srv914.hstgr.io / u366636586_anigrativ_loan
 * NEW: srv2214.hstgr.io / u889282535_loan
 *
 * Run: node scripts/migrate-db.mjs
 */

import mysql from 'mysql2/promise';

const OLD_DB = {
  host:     'srv914.hstgr.io',
  port:     3306,
  user:     'u366636586_dhruvilchitrod',
  password: 'Mahadev@6163',
  database: 'u366636586_anigrativ_loan',
  connectTimeout: 30000,
  multipleStatements: true,
};

const NEW_DB = {
  host:     'srv2214.hstgr.io',
  port:     3306,
  user:     'u889282535_loan',
  password: 'Mahadev@6163',
  database: 'u889282535_loan',
  connectTimeout: 30000,
  multipleStatements: true,
};

const CHUNK_SIZE = 100; // insert N rows at a time

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
  // String: escape single quotes and backslashes
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function getTableOrder(conn) {
  // Get all tables
  const [tables] = await conn.query(`SHOW TABLES`);
  const key = Object.keys(tables[0])[0];
  return tables.map(t => t[key]);
}

async function migrateTable(oldConn, newConn, table) {
  // Get row count
  const [[{ cnt }]] = await oldConn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
  if (cnt === 0) {
    console.log(`  ⬜ ${table}: empty, skipped`);
    return;
  }

  // Get all rows
  const [rows] = await oldConn.query(`SELECT * FROM \`${table}\``);
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const values = chunk.map(row =>
      `(${Object.values(row).map(escapeValue).join(', ')})`
    ).join(',\n');

    try {
      await newConn.query(
        `INSERT IGNORE INTO \`${table}\` (${columns}) VALUES ${values}`
      );
      inserted += chunk.length;
    } catch (err) {
      console.error(`  ❌ Error inserting chunk into ${table}:`, err.message);
      // Try row by row for this chunk
      for (const row of chunk) {
        const singleValues = `(${Object.values(row).map(escapeValue).join(', ')})`;
        try {
          await newConn.query(
            `INSERT IGNORE INTO \`${table}\` (${columns}) VALUES ${singleValues}`
          );
          inserted++;
        } catch (rowErr) {
          console.error(`  ⚠️  Skipped row in ${table}:`, rowErr.message.substring(0, 100));
        }
      }
    }
  }
  console.log(`  ✅ ${table}: ${inserted}/${rows.length} rows copied`);
}

async function main() {
  console.log('🔌 Connecting to OLD database...');
  let oldConn;
  try {
    oldConn = await mysql.createConnection(OLD_DB);
    console.log('✅ Connected to OLD DB');
  } catch (err) {
    console.error('❌ Cannot connect to OLD DB:', err.message);
    console.log('\n⚠️  Old DB is unreachable. Will only push schema to new DB.');
    oldConn = null;
  }

  console.log('\n🔌 Connecting to NEW database...');
  let newConn;
  try {
    newConn = await mysql.createConnection(NEW_DB);
    console.log('✅ Connected to NEW DB');
  } catch (err) {
    console.error('❌ Cannot connect to NEW DB:', err.message);
    process.exit(1);
  }

  if (!oldConn) {
    console.log('\n📋 New DB connected. Run "npx prisma db push" separately to create schema.');
    await newConn.end();
    return;
  }

  // Get table list from OLD db
  const tables = await getTableOrder(oldConn);
  console.log(`\n📋 Found ${tables.length} tables in old DB:\n  ${tables.join(', ')}\n`);

  // Disable FK checks on new DB for safe insertion order
  await newConn.query('SET FOREIGN_KEY_CHECKS = 0');
  await newConn.query('SET SQL_MODE = ""');

  console.log('🚀 Starting data migration...\n');
  let success = 0, failed = 0;

  for (const table of tables) {
    try {
      await migrateTable(oldConn, newConn, table);
      success++;
    } catch (err) {
      console.error(`  ❌ Failed table ${table}:`, err.message);
      failed++;
    }
  }

  // Re-enable FK checks
  await newConn.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log(`\n🎉 Migration complete!`);
  console.log(`   ✅ Tables succeeded: ${success}`);
  console.log(`   ❌ Tables failed:    ${failed}`);

  await oldConn.end();
  await newConn.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
