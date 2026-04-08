/**
 * Workflow Validator API
 * 
 * Endpoints for managing and running the workflow validator.
 * Only accessible to SuperAdmin users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rulesEngine } from '@/lib/workflow-validator/rules-engine';
import { EMIPaymentStatus } from '@prisma/client';

// Get validator settings (create default if not exists)
async function getOrCreateSettings() {
  let settings = await db.validatorSettings.findFirst();
  
  if (!settings) {
    settings = await db.validatorSettings.create({
      data: {
        isEnabled: true,
        scheduleType: 'HOURLY',
        maxIssuesPerRun: 100,
        timeoutMinutes: 30
      }
    });
  }
  
  return settings;
}

// GET - Fetch issues, rules, settings, or run history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Get pending issues
    if (action === 'issues') {
      const status = searchParams.get('status') || 'PENDING';
      
      const where: Record<string, unknown> = { status };
      
      const issues = await db.validationIssue.findMany({
        where,
        include: {
          rule: {
            select: {
              code: true,
              name: true,
              category: true,
              severity: true,
              autoFixable: true
            }
          }
        },
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'desc' }
        ],
        take: 100
      });
      
      return NextResponse.json({ success: true, issues });
    }
    
    // Get all registered rules
    if (action === 'rules') {
      const rules = rulesEngine.getRegisteredRules();
      
      // Also get rule statistics from database
      const dbRules = await db.validationRule.findMany();
      const ruleMap = new Map(dbRules.map(r => [r.code, r]));
      
      const rulesWithStats = rules.map(rule => ({
        ...rule,
        timesDetected: ruleMap.get(rule.code)?.timesDetected || 0,
        timesFixed: ruleMap.get(rule.code)?.timesFixed || 0,
        lastDetectedAt: ruleMap.get(rule.code)?.lastDetectedAt || null,
        dbId: ruleMap.get(rule.code)?.id || null
      }));
      
      return NextResponse.json({ success: true, rules: rulesWithStats });
    }
    
    // Get settings
    if (action === 'settings') {
      const settings = await getOrCreateSettings();
      return NextResponse.json({ success: true, settings });
    }
    
    // Get run history
    if (action === 'history') {
      const runs = await db.validatorRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 50
      });
      
      return NextResponse.json({ success: true, runs });
    }
    
    // Get statistics
    if (action === 'stats') {
      const [pendingIssues, criticalCount, highCount, mediumCount, lowCount, totalFixed, totalRuns] = await Promise.all([
        db.validationIssue.count({ where: { status: 'PENDING' } }),
        db.validationIssue.count({ where: { status: 'PENDING', severity: 'CRITICAL' } }),
        db.validationIssue.count({ where: { status: 'PENDING', severity: 'HIGH' } }),
        db.validationIssue.count({ where: { status: 'PENDING', severity: 'MEDIUM' } }),
        db.validationIssue.count({ where: { status: 'PENDING', severity: 'LOW' } }),
        db.validationIssue.count({ where: { status: 'FIXED' } }),
        db.validatorRun.count()
      ]);
      
      const lastRun = await db.validatorRun.findFirst({
        orderBy: { startedAt: 'desc' }
      });
      
      return NextResponse.json({
        success: true,
        stats: {
          pendingIssues,
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          totalFixed,
          totalRuns,
          lastRunAt: lastRun?.startedAt || null,
          lastRunStatus: lastRun?.status || null
        }
      });
    }
    
    // Get single issue details
    if (action === 'issue') {
      const issueId = searchParams.get('issueId');
      if (!issueId) {
        return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });
      }
      
      const issue = await db.validationIssue.findUnique({
        where: { id: issueId },
        include: {
          rule: true,
          fixLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
      
      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, issue });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ValidatorAPI] GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST - Run validation scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, userName, ruleCode } = body;
    
    // Run full validation scan
    if (action === 'run') {
      // Check if already running
      const settings = await getOrCreateSettings();
      if (settings.isRunning) {
        return NextResponse.json({ 
          error: 'Validator is already running',
          isRunning: true
        }, { status: 409 });
      }
      
      // Create run record
      const run = await db.validatorRun.create({
        data: {
          runType: 'MANUAL',
          triggeredBy: userId,
          triggeredByName: userName,
          status: 'RUNNING'
        }
      });
      
      // Mark as running
      await db.validatorSettings.update({
        where: { id: settings.id },
        data: { isRunning: true }
      });
      
      try {
        // Run validation
        const disabledRules = settings.disabledRules ? JSON.parse(settings.disabledRules) : [];
        rulesEngine.setDisabledRules(disabledRules);
        rulesEngine.setMaxIssuesPerRun(settings.maxIssuesPerRun);
        
        const result = await rulesEngine.runAllValidations();
        
        // Save issues to database
        for (const issue of result.issues) {
          // Get or create rule
          let rule = await db.validationRule.findUnique({
            where: { code: issue.ruleCode }
          });
          
          if (!rule) {
            rule = await db.validationRule.create({
              data: {
                code: issue.ruleCode,
                name: issue.title,
                description: issue.description,
                category: issue.category,
                severity: issue.severity,
                detectionLogic: '{}',
                timesDetected: 0,
                timesFixed: 0
              }
            });
          }
          
          // Check if similar issue already exists
          const existingIssue = await db.validationIssue.findFirst({
            where: {
              ruleId: rule.id,
              entityId: issue.entityId,
              status: 'PENDING'
            }
          });
          
          if (!existingIssue) {
            await db.validationIssue.create({
              data: {
                ruleId: rule.id,
                entityType: issue.entityType,
                entityId: issue.entityId,
                entityIdentifier: issue.entityIdentifier,
                title: issue.title,
                description: issue.description,
                severity: issue.severity,
                currentState: JSON.stringify(issue.currentState),
                expectedState: JSON.stringify(issue.expectedState),
                suggestedFix: JSON.stringify(issue.suggestedFix),
                fixDescription: issue.fixDescription,
                fixSqlPreview: issue.fixSqlPreview,
                relatedEntities: issue.relatedEntities ? JSON.stringify(issue.relatedEntities) : null,
                status: 'PENDING'
              }
            });
          }
          
          // Update rule stats
          await db.validationRule.update({
            where: { id: rule.id },
            data: {
              timesDetected: { increment: 1 },
              lastDetectedAt: new Date()
            }
          });
        }
        
        // Update run record
        await db.validatorRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            durationMs: result.duration,
            rulesRun: rulesEngine.getRegisteredRules().length,
            issuesFound: result.issuesFound
          }
        });
        
        // Update settings
        await db.validatorSettings.update({
          where: { id: settings.id },
          data: {
            isRunning: false,
            lastRunAt: new Date(),
            totalRuns: { increment: 1 },
            totalIssuesFound: { increment: result.issuesFound }
          }
        });
        
        return NextResponse.json({
          success: true,
          runId: run.id,
          issuesFound: result.issuesFound,
          duration: result.duration,
          errors: result.errors
        });
        
      } catch (validationError) {
        // Update run as failed
        await db.validatorRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error'
          }
        });
        
        // Reset running flag
        await db.validatorSettings.update({
          where: { id: settings.id },
          data: { isRunning: false }
        });
        
        throw validationError;
      }
    }
    
    // Run single rule
    if (action === 'run-rule') {
      if (!ruleCode) {
        return NextResponse.json({ error: 'Rule code required' }, { status: 400 });
      }
      
      const issues = await rulesEngine.runRule(ruleCode);
      
      return NextResponse.json({
        success: true,
        ruleCode,
        issuesFound: issues.length,
        issues
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ValidatorAPI] POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to run validation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// PUT - Update settings, approve/reject fix
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    // Update settings
    if (action === 'update-settings') {
      const settings = await getOrCreateSettings();
      
      const updated = await db.validatorSettings.update({
        where: { id: settings.id },
        data: {
          isEnabled: body.isEnabled ?? settings.isEnabled,
          scheduleType: body.scheduleType ?? settings.scheduleType,
          customCron: body.customCron ?? settings.customCron,
          maxIssuesPerRun: body.maxIssuesPerRun ?? settings.maxIssuesPerRun,
          timeoutMinutes: body.timeoutMinutes ?? settings.timeoutMinutes,
          notifyOnIssues: body.notifyOnIssues ?? settings.notifyOnIssues,
          notifyOnCritical: body.notifyOnCritical ?? settings.notifyOnCritical,
          notifyOnFixes: body.notifyOnFixes ?? settings.notifyOnFixes,
          notifyEmails: body.notifyEmails ?? settings.notifyEmails,
          autoFixEnabled: body.autoFixEnabled ?? settings.autoFixEnabled,
          autoFixSeverities: body.autoFixSeverities ?? settings.autoFixSeverities,
          autoFixRequiresApproval: body.autoFixRequiresApproval ?? settings.autoFixRequiresApproval,
          disabledRules: body.disabledRules ?? settings.disabledRules,
          parallelRules: body.parallelRules ?? settings.parallelRules,
          batchSize: body.batchSize ?? settings.batchSize
        }
      });
      
      return NextResponse.json({ success: true, settings: updated });
    }
    
    // Approve fix
    if (action === 'approve') {
      const { issueId, userId, userName } = body;
      
      if (!issueId) {
        return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });
      }
      
      const issue = await db.validationIssue.findUnique({
        where: { id: issueId },
        include: { rule: true }
      });
      
      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      
      if (issue.status !== 'PENDING') {
        return NextResponse.json({ error: 'Issue is not in PENDING status' }, { status: 400 });
      }
      
      // Parse the suggested fix
      const suggestedFix = JSON.parse(issue.suggestedFix) as Record<string, unknown>;
      
      // Apply the fix based on action type
      let fixResult = { success: false, message: 'No fix action defined' };
      
      try {
        if (suggestedFix.action === 'UPDATE_FIELD') {
          const { entityType, entityId, field, newValue } = suggestedFix;
          
          if (entityType === 'OFFLINE_LOAN') {
            await db.offlineLoan.update({
              where: { id: entityId as string },
              data: { [field as string]: newValue }
            });
            fixResult = { success: true, message: `Updated ${field} to ${newValue}` };
          }
        }
        
        if (suggestedFix.action === 'UPDATE_STATUS') {
          const { emiId, newStatus } = suggestedFix;
          await db.offlineLoanEMI.update({
            where: { id: emiId as string },
            data: { paymentStatus: newStatus as EMIPaymentStatus }
          });
          fixResult = { success: true, message: `Updated status to ${newStatus}` };
        }
        
        if (suggestedFix.action === 'CREATE_MAPPING') {
          const { originalLoanId, mirrorLoanId, originalCompanyId, mirrorCompanyId, displayColor } = suggestedFix;
          
          await db.mirrorLoanMapping.create({
            data: {
              originalLoanId: originalLoanId as string,
              mirrorLoanId: mirrorLoanId as string,
              originalCompanyId: originalCompanyId as string,
              mirrorCompanyId: mirrorCompanyId as string,
              displayColor: displayColor as string,
              isOfflineLoan: true,
              mirrorType: 'CUSTOM_RATE',
              originalInterestRate: 0,
              mirrorInterestRate: 0,
              originalEMIAmount: 0,
              originalTenure: 0,
              mirrorTenure: 0,
              createdBy: userId || 'SYSTEM'
            }
          });
          fixResult = { success: true, message: 'Created mirror loan mapping' };
        }
        
      } catch (fixError) {
        fixResult = { 
          success: false, 
          message: fixError instanceof Error ? fixError.message : 'Fix failed' 
        };
      }
      
      // Update issue status
      const updatedIssue = await db.validationIssue.update({
        where: { id: issueId },
        data: {
          status: fixResult.success ? 'FIXED' : 'CANT_FIX',
          reviewedById: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          fixedById: userId,
          fixedByName: userName,
          fixedAt: fixResult.success ? new Date() : null,
          fixResult: JSON.stringify(fixResult)
        }
      });
      
      // Create fix log
      await db.validationFixLog.create({
        data: {
          issueId,
          fixType: 'MANUAL',
          fixApplied: issue.suggestedFix,
          appliedById: userId,
          appliedByName: userName,
          result: fixResult.success ? 'SUCCESS' : 'FAILED',
          errorMessage: fixResult.success ? null : fixResult.message,
          affectedRecords: fixResult.success ? 1 : 0
        }
      });
      
      // Update rule stats
      if (fixResult.success && issue.rule) {
        await db.validationRule.update({
          where: { id: issue.rule.id },
          data: { timesFixed: { increment: 1 } }
        });
        
        // Update settings
        const settings = await getOrCreateSettings();
        await db.validatorSettings.update({
          where: { id: settings.id },
          data: { totalIssuesFixed: { increment: 1 } }
        });
      }
      
      return NextResponse.json({
        success: true,
        issue: updatedIssue,
        fixResult
      });
    }
    
    // Reject fix
    if (action === 'reject') {
      const { issueId, userId, userName, reason } = body;
      
      if (!issueId) {
        return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });
      }
      
      const updatedIssue = await db.validationIssue.update({
        where: { id: issueId },
        data: {
          status: 'REJECTED',
          reviewedById: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          reviewNotes: reason || 'Rejected by user'
        }
      });
      
      return NextResponse.json({ success: true, issue: updatedIssue });
    }
    
    // Ignore issue
    if (action === 'ignore') {
      const { issueId, userId, userName, reason } = body;
      
      if (!issueId) {
        return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });
      }
      
      const updatedIssue = await db.validationIssue.update({
        where: { id: issueId },
        data: {
          status: 'IGNORED',
          reviewedById: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          reviewNotes: reason || 'Ignored by user'
        }
      });
      
      return NextResponse.json({ success: true, issue: updatedIssue });
    }
    
    // Toggle rule active status
    if (action === 'toggle-rule') {
      const { ruleCode, isActive } = body;
      
      if (!ruleCode) {
        return NextResponse.json({ error: 'Rule code required' }, { status: 400 });
      }
      
      const settings = await getOrCreateSettings();
      const disabledRules = settings.disabledRules ? JSON.parse(settings.disabledRules) : [];
      
      if (isActive) {
        // Remove from disabled list
        const newDisabledRules = disabledRules.filter((r: string) => r !== ruleCode);
        await db.validatorSettings.update({
          where: { id: settings.id },
          data: { disabledRules: JSON.stringify(newDisabledRules) }
        });
      } else {
        // Add to disabled list
        if (!disabledRules.includes(ruleCode)) {
          disabledRules.push(ruleCode);
          await db.validatorSettings.update({
            where: { id: settings.id },
            data: { disabledRules: JSON.stringify(disabledRules) }
          });
        }
      }
      
      return NextResponse.json({ success: true, isActive });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ValidatorAPI] PUT error:', error);
    return NextResponse.json({ 
      error: 'Failed to update', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE - Delete issue or clear history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Clear all pending issues (use with caution)
    if (action === 'clear-pending') {
      const result = await db.validationIssue.deleteMany({
        where: { status: 'PENDING' }
      });
      
      return NextResponse.json({ 
        success: true, 
        deletedCount: result.count 
      });
    }
    
    // Clear run history
    if (action === 'clear-history') {
      await db.validatorRun.deleteMany({});
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ValidatorAPI] DELETE error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
