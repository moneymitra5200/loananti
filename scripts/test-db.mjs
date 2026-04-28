import mysql from 'mysql2/promise';

const NEW_DB = {
  host:     'srv2214.hstgr.io',
  port:     3306,
  user:     'u889282535_loan',
  password: 'Mahadev@6163',
  database: 'u889282535_loan',
  connectTimeout: 15000,
};

async function test() {
  console.log('🔌 Testing connection to new database...');
  console.log(`   Host: ${NEW_DB.host}:${NEW_DB.port}`);
  console.log(`   DB:   ${NEW_DB.database}\n`);

  let conn;
  try {
    conn = await mysql.createConnection(NEW_DB);
    console.log('✅ Connected successfully!\n');

    // Count rows in key tables
    const tables = ['User', 'Company', 'OfflineLoan', 'OfflineLoanEMI', 'MirrorLoanMapping', 
                    'LoanApplication', 'ChartOfAccount', 'JournalEntry', 'SystemSetting'];
    
    console.log('📊 Row counts:');
    for (const table of tables) {
      try {
        const [[row]] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        const cnt = row.cnt;
        const icon = cnt > 0 ? '✅' : '⬜';
        console.log(`   ${icon} ${table.padEnd(22)} ${cnt} rows`);
      } catch (e) {
        console.log(`   ❌ ${table.padEnd(22)} ERROR: ${e.message}`);
      }
    }

    // Test a real query
    console.log('\n👤 Users in DB:');
    const [users] = await conn.query(`SELECT email, role, isActive FROM \`User\` LIMIT 10`);
    for (const u of users) {
      console.log(`   - ${u.email} (${u.role}) active=${u.isActive}`);
    }

    console.log('\n🎉 Database is healthy and ready!');
  } catch (err) {
    console.error('❌ Connection FAILED:', err.message);
    console.error('\nPossible causes:');
    console.error('  1. DB server temporarily down (Hostinger shared)');
    console.error('  2. Wrong credentials or host');
    console.error('  3. IP not whitelisted (check Hostinger remote MySQL settings)');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

test();
