import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// This endpoint is used to migrate the database schema
// It should be called after deploying new code with schema changes
// Security: Only allow with a secret key

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.$queryRaw<any[]>`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = ${tableName} 
      AND COLUMN_NAME = ${columnName}
    `;
    return result.length > 0;
  } catch {
    return false;
  }
}

async function addColumnIfNotExists(
  tableName: string, 
  columnName: string, 
  columnDef: string,
  results: string[]
): Promise<void> {
  try {
    const exists = await columnExists(tableName, columnName);
    if (exists) {
      results.push(`${tableName}.${columnName} already exists`);
      return;
    }
    
    await db.$executeRawUnsafe(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`
    );
    results.push(`Added ${columnName} to ${tableName}`);
  } catch (e: any) {
    if (e.message?.includes('Duplicate column')) {
      results.push(`${tableName}.${columnName} already exists`);
    } else {
      results.push(`${tableName}.${columnName}: ${e.message}`);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization');
    const migrateKey = process.env.MIGRATE_KEY || 'migrate-schema-2024';
    
    if (authHeader !== `Bearer ${migrateKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = [];

    // Add displayColor column to OfflineLoan table
    await addColumnIfNotExists(
      'OfflineLoan',
      'displayColor',
      'VARCHAR(191) NULL',
      results
    );

    // Add displayColor column to MirrorLoanMapping table
    await addColumnIfNotExists(
      'MirrorLoanMapping',
      'displayColor',
      'VARCHAR(191) NULL',
      results
    );

    // Add bankAccountId column to OfflineLoan if missing
    await addColumnIfNotExists(
      'OfflineLoan',
      'bankAccountId',
      'VARCHAR(191) NULL',
      results
    );

    // Add productId column to OfflineLoan if missing
    await addColumnIfNotExists(
      'OfflineLoan',
      'productId',
      'VARCHAR(191) NULL',
      results
    );

    // Add originalEMIId column to OfflineLoanEMI for mirror loan tracking
    await addColumnIfNotExists(
      'OfflineLoanEMI',
      'originalEMIId',
      'VARCHAR(191) NULL',
      results
    );

    // Add isMirrorEMI column to OfflineLoanEMI
    await addColumnIfNotExists(
      'OfflineLoanEMI',
      'isMirrorEMI',
      'BOOLEAN DEFAULT false',
      results
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Schema migration completed',
      results 
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to check migration status
export async function GET(request: NextRequest) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization');
    const migrateKey = process.env.MIGRATE_KEY || 'migrate-schema-2024';
    
    if (authHeader !== `Bearer ${migrateKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const columns: any = {};

    // Check OfflineLoan columns
    try {
      const offlineLoanColumns = await db.$queryRaw<any[]>`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'OfflineLoan'
      `;
      columns.OfflineLoan = offlineLoanColumns.map(c => c.COLUMN_NAME);
    } catch (e: any) {
      columns.OfflineLoan = `Error: ${e.message}`;
    }

    // Check MirrorLoanMapping columns
    try {
      const mirrorLoanColumns = await db.$queryRaw<any[]>`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'MirrorLoanMapping'
      `;
      columns.MirrorLoanMapping = mirrorLoanColumns.map(c => c.COLUMN_NAME);
    } catch (e: any) {
      columns.MirrorLoanMapping = `Error: ${e.message}`;
    }

    // Check OfflineLoanEMI columns
    try {
      const emiColumns = await db.$queryRaw<any[]>`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'OfflineLoanEMI'
      `;
      columns.OfflineLoanEMI = emiColumns.map(c => c.COLUMN_NAME);
    } catch (e: any) {
      columns.OfflineLoanEMI = `Error: ${e.message}`;
    }

    return NextResponse.json({ 
      success: true, 
      columns 
    });

  } catch (error: any) {
    console.error('Migration check error:', error);
    return NextResponse.json({ 
      error: 'Migration check failed', 
      details: error.message 
    }, { status: 500 });
  }
}
