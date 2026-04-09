import { NextRequest, NextResponse } from 'next/server';
import { runAllAutoFixScanners, needsAutoFix } from '@/lib/auto-fix-scanner';

/**
 * AUTO-FIX SCANNER API
 * 
 * POST /api/accounting/auto-fix
 * Runs all auto-fix scanners and repairs data inconsistencies
 * 
 * GET /api/accounting/auto-fix
 * Checks if auto-fix is needed (doesn't make changes)
 */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log(`[Auto-Fix] Running scanner for company: ${companyId}`);
    
    const report = await runAllAutoFixScanners(companyId);
    
    console.log(`[Auto-Fix] Complete: Found ${report.totalIssuesFound}, Fixed ${report.totalIssuesFixed}`);

    return NextResponse.json(report);

  } catch (error) {
    console.error('[Auto-Fix] Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      totalIssuesFound: 0,
      totalIssuesFixed: 0,
      scans: [],
      timestamp: new Date()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const check = await needsAutoFix(companyId);

    return NextResponse.json({
      companyId,
      needsAutoFix: check.needed,
      issues: check.issues,
      message: check.needed 
        ? `Found ${check.issues.length} issue(s) that need fixing` 
        : 'No issues found'
    });

  } catch (error) {
    console.error('[Auto-Fix Check] Error:', error);
    return NextResponse.json({
      needsAutoFix: false,
      issues: [],
      message: 'Error checking for issues'
    }, { status: 500 });
  }
}
