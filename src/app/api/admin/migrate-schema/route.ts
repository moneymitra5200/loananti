import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// This endpoint is used to migrate the database schema
// GET: Auto-runs migration (convenience method)
// POST: Runs migration with auth check

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
      results.push(`✓ ${tableName}.${columnName} already exists`);
      return;
    }
    
    await db.$executeRawUnsafe(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`
    );
    results.push(`✅ Added ${columnName} to ${tableName}`);
  } catch (e: any) {
    if (e.message?.includes('Duplicate column')) {
      results.push(`✓ ${tableName}.${columnName} already exists`);
    } else {
      results.push(`❌ ${tableName}.${columnName}: ${e.message}`);
    }
  }
}

async function runMigration(): Promise<{ success: boolean; results: string[] }> {
  const results: string[] = [];

  try {
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

    return { success: true, results };
  } catch (error: any) {
    results.push(`❌ Migration error: ${error.message}`);
    return { success: false, results };
  }
}

// GET endpoint - Auto-runs migration (convenience method)
export async function GET(request: NextRequest) {
  const { success, results } = await runMigration();
  
  // Also get current column status
  const columns: any = {};
  
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

  return NextResponse.json({ 
    success,
    message: success ? 'Schema migration completed!' : 'Migration had issues',
    results,
    currentColumns: columns
  });
}

// POST endpoint - Same as GET (kept for backwards compatibility)
export async function POST(request: NextRequest) {
  const { success, results } = await runMigration();
  
  return NextResponse.json({ 
    success,
    message: success ? 'Schema migration completed!' : 'Migration had issues',
    results
  });
}
