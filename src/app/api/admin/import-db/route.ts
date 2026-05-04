import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Secret key to protect this endpoint
const IMPORT_SECRET = process.env.DB_IMPORT_SECRET || 'moneymitra-import-2026';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('x-import-secret');
    if (authHeader !== IMPORT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.text();
    if (!body || body.length < 10) {
      return NextResponse.json({ error: 'No SQL content provided' }, { status: 400 });
    }

    // Parse DATABASE_URL for connection params
    const dbUrl = process.env.DATABASE_URL || '';
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/([^?]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Cannot parse DATABASE_URL', url: dbUrl.substring(0, 30) }, { status: 500 });
    }

    const [, user, password, host, portStr, database] = match;
    const port = portStr ? parseInt(portStr) : 3306;

    // Connect directly via mysql2 (localhost works on Hostinger!)
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 60000,
    });

    // Split SQL into individual statements
    const sqlContent = body
      .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
      .replace(/^--.*$/gm, '')          // remove line comments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 5);

    let executed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const stmt of sqlContent) {
      try {
        // Skip CREATE TABLE - prisma already created them
        // Only run INSERT, UPDATE, DELETE, SET statements
        const upper = stmt.toUpperCase().trimStart();
        if (
          upper.startsWith('INSERT') ||
          upper.startsWith('UPDATE') ||
          upper.startsWith('DELETE') ||
          upper.startsWith('SET ') ||
          upper.startsWith('START TRANSACTION') ||
          upper.startsWith('COMMIT')
        ) {
          await connection.execute(stmt);
          executed++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        // Duplicate key errors are OK (data already exists)
        if (err.code === 'ER_DUP_ENTRY') {
          skipped++;
        } else {
          errors.push(`[${err.code}] ${err.message?.substring(0, 100)}`);
        }
      }
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      executed,
      skipped,
      errors: errors.slice(0, 20), // return max 20 errors
      message: `Import complete! ${executed} statements executed, ${skipped} skipped/duplicates, ${errors.length} errors`,
    });

  } catch (err: any) {
    console.error('[import-db] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    message: 'POST your SQL dump here with header: x-import-secret: moneymitra-import-2026',
    usage: 'curl -X POST https://moneymitrafinancialadvisor.com/api/admin/import-db -H "x-import-secret: moneymitra-import-2026" -H "Content-Type: text/plain" --data-binary @your-file.sql'
  });
}
