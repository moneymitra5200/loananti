/**
 * Workflow Validator - Rules Engine
 * 
 * This is the core intelligence of the AI Bot that validates your loan system.
 * It runs validation rules to detect issues and generates fix suggestions.
 * 
 * Features:
 * - Runs in background (doesn't block other operations)
 * - Detects issues in mirror loans, accounting, EMIs, etc.
 * - Generates intelligent fix suggestions
 * - Tracks all issues and fixes
 */

import { db } from '@/lib/db';

// Types
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueCategory = 'MIRROR_LOAN' | 'ACCOUNTING' | 'EMI' | 'BALANCE' | 'DATA_INTEGRITY';
export type EntityType = 'OFFLINE_LOAN' | 'LOAN_APPLICATION' | 'EMI' | 'JOURNAL_ENTRY' | 'MIRROR_MAPPING' | 'COMPANY' | 'BANK_ACCOUNT';

export interface DetectedIssue {
  ruleCode: string;
  entityType: EntityType;
  entityId: string;
  entityIdentifier?: string;
  title: string;
  description: string;
  severity: Severity;
  category: IssueCategory;
  currentState: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  suggestedFix: Record<string, unknown>;
  fixDescription: string;
  fixSqlPreview?: string;
  relatedEntities?: Array<{ type: string; id: string; relation: string }>;
}

export interface ValidationResult {
  success: boolean;
  issuesFound: number;
  issues: DetectedIssue[];
  errors: string[];
  duration: number;
  recordsScanned: number;
}

export interface RuleDefinition {
  code: string;
  name: string;
  description: string;
  category: IssueCategory;
  severity: Severity;
  autoFixable: boolean;
  requiresApproval: boolean;
  impactDescription: string;
  fixGuidance: string;
  detect: () => Promise<DetectedIssue[]>;
}

/**
 * Rules Engine - Main validation class
 */
export class RulesEngine {
  private rules: Map<string, RuleDefinition> = new Map();
  private disabledRules: Set<string> = new Set();
  private maxIssuesPerRun: number = 100;

  constructor() {
    this.registerAllRules();
  }

  /**
   * Register all validation rules
   */
  private registerAllRules(): void {
    // Mirror Loan Rules
    this.registerRule(this.createMirrorMappingExistsRule());
    this.registerRule(this.createMirrorLoanCreatedRule());
    this.registerRule(this.createDisplayColorMatchRule());
    this.registerRule(this.createIsMirrorFlagCorrectRule());
    this.registerRule(this.createMirrorCompanyCorrectRule());

    // Accounting Rules
    this.registerRule(this.createRealEmiMirrorCompanyRule());
    this.registerRule(this.createExtraEmiOriginalCompanyRule());
    this.registerRule(this.createDisbursementEntryExistsRule());

    // EMI Rules
    this.registerRule(this.createEmiCountMatchesTenureRule());
    this.registerRule(this.createEmiAmountCorrectRule());
    this.registerRule(this.createPaidStatusConsistentRule());

    // Data Integrity Rules
    this.registerRule(this.createOrphanMirrorLoansRule());
    this.registerRule(this.createDuplicateLoanNumberRule());
  }

  /**
   * Register a single rule
   */
  private registerRule(rule: RuleDefinition): void {
    this.rules.set(rule.code, rule);
  }

  /**
   * Set disabled rules
   */
  setDisabledRules(disabledRules: string[]): void {
    this.disabledRules = new Set(disabledRules);
  }

  /**
   * Set max issues per run
   */
  setMaxIssuesPerRun(max: number): void {
    this.maxIssuesPerRun = max;
  }

  /**
   * Run all validation rules
   */
  async runAllValidations(): Promise<ValidationResult> {
    const startTime = Date.now();
    const allIssues: DetectedIssue[] = [];
    const errors: string[] = [];
    let recordsScanned = 0;

    console.log('[WorkflowValidator] Starting validation run...');

    for (const [code, rule] of this.rules) {
      // Skip disabled rules
      if (this.disabledRules.has(code)) {
        console.log(`[WorkflowValidator] Skipping disabled rule: ${code}`);
        continue;
      }

      try {
        console.log(`[WorkflowValidator] Running rule: ${code}`);
        const issues = await rule.detect();
        
        if (issues.length > 0) {
          allIssues.push(...issues);
          console.log(`[WorkflowValidator] Rule ${code} found ${issues.length} issues`);
        }
        
        // Check if we've hit the max
        if (allIssues.length >= this.maxIssuesPerRun) {
          console.log(`[WorkflowValidator] Hit max issues limit (${this.maxIssuesPerRun})`);
          break;
        }
      } catch (error) {
        const errorMsg = `Rule ${code} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[WorkflowValidator] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[WorkflowValidator] Validation complete. Found ${allIssues.length} issues in ${duration}ms`);

    return {
      success: errors.length === 0,
      issuesFound: allIssues.length,
      issues: allIssues.slice(0, this.maxIssuesPerRun),
      errors,
      duration,
      recordsScanned
    };
  }

  /**
   * Run a specific rule by code
   */
  async runRule(ruleCode: string): Promise<DetectedIssue[]> {
    const rule = this.rules.get(ruleCode);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleCode}`);
    }

    return await rule.detect();
  }

  /**
   * Get all registered rules
   */
  getRegisteredRules(): RuleDefinition[] {
    return Array.from(this.rules.values());
  }

  // ==========================================
  // MIRROR LOAN VALIDATION RULES
  // ==========================================

  /**
   * Rule: Mirror Mapping Exists
   * Checks if mirror loan mappings exist for loans that should be mirrored
   */
  private createMirrorMappingExistsRule(): RuleDefinition {
    return {
      code: 'MIRROR_MAPPING_001',
      name: 'Mirror Mapping Exists',
      description: 'Checks that mirror loan mappings exist for loans configured for mirroring',
      category: 'MIRROR_LOAN',
      severity: 'CRITICAL',
      autoFixable: true,
      requiresApproval: true,
      impactDescription: 'Without proper mapping, the mirror loan will not be tracked correctly, leading to incorrect profit distribution and reporting.',
      fixGuidance: 'Create the missing MirrorLoanMapping record linking the original loan to the mirror company.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Find offline loans that have isMirrorLoan=false but have a displayColor (indicating they should be mirrored)
        const potentialMirrorLoans = await db.offlineLoan.findMany({
          where: {
            isMirrorLoan: false,
            displayColor: { not: null }
          },
          include: {
            company: { select: { id: true, name: true, code: true } }
          }
        });

        for (const loan of potentialMirrorLoans) {
          // Check if mapping exists
          const mapping = await db.mirrorLoanMapping.findFirst({
            where: { originalLoanId: loan.id, isOfflineLoan: true }
          });

          if (!mapping) {
            // Check if there's a separate mirror loan
            const mirrorLoan = await db.offlineLoan.findFirst({
              where: { originalLoanId: loan.id, isMirrorLoan: true }
            });

            if (mirrorLoan) {
              issues.push({
                ruleCode: 'MIRROR_MAPPING_001',
                entityType: 'OFFLINE_LOAN',
                entityId: loan.id,
                entityIdentifier: loan.loanNumber,
                title: 'Missing Mirror Loan Mapping',
                description: `Loan ${loan.loanNumber} has a mirror loan but no MirrorLoanMapping record exists. This affects profit tracking and parallel view display.`,
                severity: 'CRITICAL',
                category: 'MIRROR_LOAN',
                currentState: {
                  hasMapping: false,
                  hasMirrorLoan: true,
                  mirrorLoanId: mirrorLoan.id,
                  mirrorLoanNumber: mirrorLoan.loanNumber
                },
                expectedState: {
                  hasMapping: true,
                  mappingRecord: {
                    originalLoanId: loan.id,
                    mirrorLoanId: mirrorLoan.id,
                    originalCompanyId: loan.companyId,
                    mirrorCompanyId: mirrorLoan.companyId
                  }
                },
                suggestedFix: {
                  action: 'CREATE_MAPPING',
                  originalLoanId: loan.id,
                  mirrorLoanId: mirrorLoan.id,
                  originalCompanyId: loan.companyId,
                  mirrorCompanyId: mirrorLoan.companyId,
                  displayColor: loan.displayColor
                },
                fixDescription: `Create MirrorLoanMapping linking ${loan.loanNumber} to mirror loan ${mirrorLoan.loanNumber}`,
                fixSqlPreview: `INSERT INTO MirrorLoanMapping (id, originalLoanId, mirrorLoanId, originalCompanyId, mirrorCompanyId, displayColor, isOfflineLoan) VALUES (UUID(), '${loan.id}', '${mirrorLoan.id}', '${loan.companyId}', '${mirrorLoan.companyId}', '${loan.displayColor}', true);`,
                relatedEntities: [
                  { type: 'OFFLINE_LOAN', id: mirrorLoan.id, relation: 'Mirror Loan' }
                ]
              });
            }
          }
        }

        return issues;
      }
    };
  }

  /**
   * Rule: Mirror Loan Created
   * Checks if mirror loan records exist when mappings exist
   */
  private createMirrorLoanCreatedRule(): RuleDefinition {
    return {
      code: 'MIRROR_LOAN_001',
      name: 'Mirror Loan Record Created',
      description: 'Checks that mirror loan records exist when mappings indicate they should',
      category: 'MIRROR_LOAN',
      severity: 'CRITICAL',
      autoFixable: false,
      requiresApproval: true,
      impactDescription: 'Mapping exists but the actual mirror loan record is missing. This will cause errors when viewing or processing the loan.',
      fixGuidance: 'Create the mirror loan record with proper configuration or remove the mapping if no longer needed.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Find mappings with mirrorLoanId but no actual mirror loan
        const mappings = await db.mirrorLoanMapping.findMany({
          where: {
            isOfflineLoan: true,
            mirrorLoanId: { not: null }
          }
        });

        for (const mapping of mappings) {
          if (!mapping.mirrorLoanId) continue;

          const mirrorLoan = await db.offlineLoan.findUnique({
            where: { id: mapping.mirrorLoanId }
          });

          if (!mirrorLoan) {
            issues.push({
              ruleCode: 'MIRROR_LOAN_001',
              entityType: 'MIRROR_MAPPING',
              entityId: mapping.id,
              entityIdentifier: mapping.mirrorLoanNumber || mapping.id,
              title: 'Mirror Loan Record Missing',
              description: `MirrorLoanMapping exists for loan ${mapping.originalLoanId} but the mirror loan record (${mapping.mirrorLoanId}) was not found.`,
              severity: 'CRITICAL',
              category: 'MIRROR_LOAN',
              currentState: {
                mappingExists: true,
                mirrorLoanId: mapping.mirrorLoanId,
                mirrorLoanExists: false
              },
              expectedState: {
                mappingExists: true,
                mirrorLoanId: mapping.mirrorLoanId,
                mirrorLoanExists: true
              },
              suggestedFix: {
                action: 'CREATE_ORPHAN_MAPPING_FIX',
                options: ['Create mirror loan record', 'Remove mapping', 'Update mapping with correct ID']
              },
              fixDescription: 'Either create the missing mirror loan record or update/remove the mapping.',
              relatedEntities: [
                { type: 'OFFLINE_LOAN', id: mapping.originalLoanId, relation: 'Original Loan' }
              ]
            });
          }
        }

        return issues;
      }
    };
  }

  /**
   * Rule: Display Color Match
   * Checks that original and mirror loans have matching display colors
   */
  private createDisplayColorMatchRule(): RuleDefinition {
    return {
      code: 'MIRROR_COLOR_001',
      name: 'Display Color Match',
      description: 'Checks that original and mirror loans have matching display colors for proper visual pairing',
      category: 'MIRROR_LOAN',
      severity: 'LOW',
      autoFixable: true,
      requiresApproval: false,
      impactDescription: 'Mismatched colors make it harder to visually identify loan pairs in the UI.',
      fixGuidance: 'Update the display color to match between original and mirror loans.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        const mappings = await db.mirrorLoanMapping.findMany({
          where: {
            isOfflineLoan: true,
            mirrorLoanId: { not: null }
          }
        });

        for (const mapping of mappings) {
          if (!mapping.mirrorLoanId) continue;

          // Fetch original and mirror offline loans
          const [originalLoan, mirrorLoan] = await Promise.all([
            db.offlineLoan.findUnique({
              where: { id: mapping.originalLoanId },
              select: { id: true, loanNumber: true, displayColor: true }
            }),
            db.offlineLoan.findUnique({
              where: { id: mapping.mirrorLoanId },
              select: { id: true, loanNumber: true, displayColor: true }
            })
          ]);

          if (mirrorLoan && originalLoan) {
            const originalColor = originalLoan.displayColor || mapping.displayColor;
            const mirrorColor = mirrorLoan.displayColor;

            if (originalColor !== mirrorColor) {
              issues.push({
                ruleCode: 'MIRROR_COLOR_001',
                entityType: 'OFFLINE_LOAN',
                entityId: mirrorLoan.id,
                entityIdentifier: mirrorLoan.loanNumber,
                title: 'Display Color Mismatch',
                description: `Original loan ${originalLoan.loanNumber} has color ${originalColor} but mirror loan ${mirrorLoan.loanNumber} has color ${mirrorColor}.`,
                severity: 'LOW',
                category: 'MIRROR_LOAN',
                currentState: {
                  originalColor,
                  mirrorColor,
                  match: false
                },
                expectedState: {
                  originalColor,
                  mirrorColor: originalColor,
                  match: true
                },
                suggestedFix: {
                  action: 'UPDATE_FIELD',
                  entityType: 'OFFLINE_LOAN',
                  entityId: mirrorLoan.id,
                  field: 'displayColor',
                  newValue: originalColor
                },
                fixDescription: `Update mirror loan display color to ${originalColor}`,
                fixSqlPreview: `UPDATE OfflineLoan SET displayColor = '${originalColor}' WHERE id = '${mirrorLoan.id}';`,
                relatedEntities: [
                  { type: 'OFFLINE_LOAN', id: mapping.originalLoanId, relation: 'Original Loan' }
                ]
              });
            }
          }
        }

        return issues;
      }
    };
  }

  /**
   * Rule: Is Mirror Flag Correct
   * Checks that isMirrorLoan flag is set correctly
   */
  private createIsMirrorFlagCorrectRule(): RuleDefinition {
    return {
      code: 'MIRROR_FLAG_001',
      name: 'Is Mirror Flag Correct',
      description: 'Checks that isMirrorLoan flag is set correctly for mirror loans',
      category: 'MIRROR_LOAN',
      severity: 'HIGH',
      autoFixable: true,
      requiresApproval: true,
      impactDescription: 'Incorrect isMirrorLoan flag causes loans to be displayed incorrectly in the parallel view and may affect EMI payment routing.',
      fixGuidance: 'Update the isMirrorLoan flag to the correct value.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Find mirror loans from mappings where isMirrorLoan is false
        const mappings = await db.mirrorLoanMapping.findMany({
          where: {
            isOfflineLoan: true,
            mirrorLoanId: { not: null }
          }
        });

        for (const mapping of mappings) {
          if (!mapping.mirrorLoanId) continue;

          const mirrorLoan = await db.offlineLoan.findUnique({
            where: { id: mapping.mirrorLoanId }
          });

          if (mirrorLoan && mirrorLoan.isMirrorLoan === false) {
            issues.push({
              ruleCode: 'MIRROR_FLAG_001',
              entityType: 'OFFLINE_LOAN',
              entityId: mirrorLoan.id,
              entityIdentifier: mirrorLoan.loanNumber,
              title: 'Incorrect isMirrorLoan Flag',
              description: `Loan ${mirrorLoan.loanNumber} is a mirror loan (per mapping) but isMirrorLoan flag is false. This causes incorrect display in parallel view.`,
              severity: 'HIGH',
              category: 'MIRROR_LOAN',
              currentState: {
                isMirrorLoan: false,
                shouldBeMirror: true
              },
              expectedState: {
                isMirrorLoan: true,
                shouldBeMirror: true
              },
              suggestedFix: {
                action: 'UPDATE_FIELD',
                entityType: 'OFFLINE_LOAN',
                entityId: mirrorLoan.id,
                field: 'isMirrorLoan',
                newValue: true
              },
              fixDescription: `Set isMirrorLoan = true for ${mirrorLoan.loanNumber}`,
              fixSqlPreview: `UPDATE OfflineLoan SET isMirrorLoan = true WHERE id = '${mirrorLoan.id}';`,
              relatedEntities: [
                { type: 'MIRROR_MAPPING', id: mapping.id, relation: 'Mapping Record' }
              ]
            });
          }
        }

        return issues;
      }
    };
  }

  /**
   * Rule: Mirror Company Correct
   * Checks that mirror loans are in the correct mirror company
   */
  private createMirrorCompanyCorrectRule(): RuleDefinition {
    return {
      code: 'MIRROR_COMPANY_001',
      name: 'Mirror Company Correct',
      description: 'Checks that mirror loans are assigned to the correct mirror company (C1 or C2)',
      category: 'MIRROR_LOAN',
      severity: 'CRITICAL',
      autoFixable: true,
      requiresApproval: true,
      impactDescription: 'Wrong company assignment affects accounting entries and profit distribution.',
      fixGuidance: 'Update the companyId to match the mirror company specified in the mapping.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        const mappings = await db.mirrorLoanMapping.findMany({
          where: {
            isOfflineLoan: true,
            mirrorLoanId: { not: null }
          },
          include: {
            mirrorCompany: { select: { id: true, name: true, code: true } }
          }
        });

        for (const mapping of mappings) {
          if (!mapping.mirrorLoanId) continue;

          const mirrorLoan = await db.offlineLoan.findUnique({
            where: { id: mapping.mirrorLoanId },
            include: { company: { select: { id: true, name: true, code: true } } }
          });

          if (mirrorLoan && mirrorLoan.companyId !== mapping.mirrorCompanyId) {
            issues.push({
              ruleCode: 'MIRROR_COMPANY_001',
              entityType: 'OFFLINE_LOAN',
              entityId: mirrorLoan.id,
              entityIdentifier: mirrorLoan.loanNumber,
              title: 'Mirror Loan in Wrong Company',
              description: `Mirror loan ${mirrorLoan.loanNumber} is in company ${mirrorLoan.company?.name || mirrorLoan.companyId} but should be in ${mapping.mirrorCompany?.name || mapping.mirrorCompanyId}.`,
              severity: 'CRITICAL',
              category: 'MIRROR_LOAN',
              currentState: {
                currentCompanyId: mirrorLoan.companyId,
                currentCompanyName: mirrorLoan.company?.name
              },
              expectedState: {
                currentCompanyId: mapping.mirrorCompanyId,
                currentCompanyName: mapping.mirrorCompany?.name
              },
              suggestedFix: {
                action: 'UPDATE_FIELD',
                entityType: 'OFFLINE_LOAN',
                entityId: mirrorLoan.id,
                field: 'companyId',
                newValue: mapping.mirrorCompanyId
              },
              fixDescription: `Move loan to correct mirror company: ${mapping.mirrorCompany?.name}`,
              fixSqlPreview: `UPDATE OfflineLoan SET companyId = '${mapping.mirrorCompanyId}' WHERE id = '${mirrorLoan.id}';`,
              relatedEntities: [
                { type: 'MIRROR_MAPPING', id: mapping.id, relation: 'Mapping Record' }
              ]
            });
          }
        }

        return issues;
      }
    };
  }

  // ==========================================
  // ACCOUNTING VALIDATION RULES
  // ==========================================

  /**
   * Rule: Real EMI in Mirror Company
   * Checks that real EMI accounting entries are in the mirror company
   */
  private createRealEmiMirrorCompanyRule(): RuleDefinition {
    return {
      code: 'ACCOUNTING_EMI_001',
      name: 'Real EMI in Mirror Company',
      description: 'Checks that real EMI (within mirror tenure) entries are recorded in mirror company',
      category: 'ACCOUNTING',
      severity: 'CRITICAL',
      autoFixable: true,
      requiresApproval: true,
      impactDescription: 'Incorrect company for EMI entries affects profit distribution between companies.',
      fixGuidance: 'Update the journal entry to the correct company.',
      detect: async () => {
        const issues: DetectedIssue[] = [];
        // Placeholder for accounting validation
        return issues;
      }
    };
  }

  /**
   * Rule: Extra EMI in Original Company
   * Checks that extra EMI entries are in the original company
   */
  private createExtraEmiOriginalCompanyRule(): RuleDefinition {
    return {
      code: 'ACCOUNTING_EMI_002',
      name: 'Extra EMI in Original Company',
      description: 'Checks that extra EMI (beyond mirror tenure) entries are recorded in original company',
      category: 'ACCOUNTING',
      severity: 'CRITICAL',
      autoFixable: true,
      requiresApproval: true,
      impactDescription: 'Extra EMIs should go to original company (Company 3) as pure profit.',
      fixGuidance: 'Update the journal entry to the original company.',
      detect: async () => {
        const issues: DetectedIssue[] = [];
        return issues;
      }
    };
  }

  /**
   * Rule: Disbursement Entry Exists
   * Checks that disbursement journal entries exist for all loans
   */
  private createDisbursementEntryExistsRule(): RuleDefinition {
    return {
      code: 'ACCOUNTING_DISB_001',
      name: 'Disbursement Entry Exists',
      description: 'Checks that disbursement journal entries exist for all active loans',
      category: 'ACCOUNTING',
      severity: 'HIGH',
      autoFixable: false,
      requiresApproval: true,
      impactDescription: 'Missing disbursement entries cause incorrect asset tracking.',
      fixGuidance: 'Create the disbursement journal entry for the loan.',
      detect: async () => {
        const issues: DetectedIssue[] = [];
        return issues;
      }
    };
  }

  // ==========================================
  // EMI VALIDATION RULES
  // ==========================================

  /**
   * Rule: EMI Count Matches Tenure
   * Checks that the number of EMIs matches the loan tenure
   */
  private createEmiCountMatchesTenureRule(): RuleDefinition {
    return {
      code: 'EMI_COUNT_001',
      name: 'EMI Count Matches Tenure',
      description: 'Checks that the number of EMI records matches the loan tenure',
      category: 'EMI',
      severity: 'HIGH',
      autoFixable: false,
      requiresApproval: true,
      impactDescription: 'Mismatch in EMI count will cause incorrect balance calculations.',
      fixGuidance: 'Regenerate the EMI schedule or correct the tenure.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Get all active offline loans
        const loans = await db.offlineLoan.findMany({
          where: {
            status: 'ACTIVE',
            isInterestOnlyLoan: false,
            tenure: { gt: 0 }
          },
          include: {
            _count: { select: { emis: true } }
          }
        });

        for (const loan of loans) {
          const emiCount = loan._count.emis;
          const expectedCount = loan.tenure;

          if (emiCount !== expectedCount) {
            issues.push({
              ruleCode: 'EMI_COUNT_001',
              entityType: 'OFFLINE_LOAN',
              entityId: loan.id,
              entityIdentifier: loan.loanNumber,
              title: 'EMI Count Mismatch',
              description: `Loan ${loan.loanNumber} has tenure of ${expectedCount} months but ${emiCount} EMI records exist.`,
              severity: 'HIGH',
              category: 'EMI',
              currentState: {
                tenure: expectedCount,
                emiCount
              },
              expectedState: {
                tenure: expectedCount,
                emiCount: expectedCount
              },
              suggestedFix: {
                action: 'REGENERATE_EMI_SCHEDULE',
                loanId: loan.id
              },
              fixDescription: `Regenerate EMI schedule for loan ${loan.loanNumber}`
            });
          }
        }

        return issues;
      }
    };
  }

  /**
   * Rule: EMI Amount Correct
   * Checks that EMI amounts match the calculated EMI
   */
  private createEmiAmountCorrectRule(): RuleDefinition {
    return {
      code: 'EMI_AMOUNT_001',
      name: 'EMI Amount Correct',
      description: 'Checks that EMI amounts match the loan EMI amount',
      category: 'EMI',
      severity: 'MEDIUM',
      autoFixable: false,
      requiresApproval: true,
      impactDescription: 'Incorrect EMI amounts cause payment confusion.',
      fixGuidance: 'Regenerate the EMI schedule with correct calculations.',
      detect: async () => {
        const issues: DetectedIssue[] = [];
        return issues;
      }
    };
  }

  /**
   * Rule: Paid Status Consistent
   * Checks that paid EMIs have paidAmount > 0
   */
  private createPaidStatusConsistentRule(): RuleDefinition {
    return {
      code: 'EMI_STATUS_001',
      name: 'Paid Status Consistent',
      description: 'Checks that EMIs marked as PAID have paidAmount > 0',
      category: 'EMI',
      severity: 'HIGH',
      autoFixable: true,
      requiresApproval: true,
      impactDescription: 'Inconsistent status affects balance calculations and reporting.',
      fixGuidance: 'Update the paidAmount or correct the status.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Find EMIs with PAID status but zero paidAmount
        const inconsistentEmis = await db.offlineLoanEMI.findMany({
          where: {
            paymentStatus: 'PAID',
            paidAmount: 0
          },
          include: {
            offlineLoan: { select: { id: true, loanNumber: true } }
          }
        });

        for (const emi of inconsistentEmis) {
          issues.push({
            ruleCode: 'EMI_STATUS_001',
            entityType: 'EMI',
            entityId: emi.id,
            entityIdentifier: `${emi.offlineLoan.loanNumber} - EMI #${emi.installmentNumber}`,
            title: 'Paid EMI with Zero Amount',
            description: `EMI #${emi.installmentNumber} for loan ${emi.offlineLoan.loanNumber} is marked PAID but has paidAmount = 0.`,
            severity: 'HIGH',
            category: 'EMI',
            currentState: {
              paymentStatus: 'PAID',
              paidAmount: 0
            },
            expectedState: {
              paymentStatus: 'PENDING',
              paidAmount: 0
            },
            suggestedFix: {
              action: 'UPDATE_STATUS',
              emiId: emi.id,
              newStatus: 'PENDING'
            },
            fixDescription: `Change status to PENDING for EMI #${emi.installmentNumber}`,
            fixSqlPreview: `UPDATE OfflineLoanEMI SET paymentStatus = 'PENDING' WHERE id = '${emi.id}';`,
            relatedEntities: [
              { type: 'OFFLINE_LOAN', id: emi.offlineLoanId, relation: 'Parent Loan' }
            ]
          });
        }

        return issues;
      }
    };
  }

  // ==========================================
  // DATA INTEGRITY RULES
  // ==========================================

  /**
   * Rule: Orphan Mirror Loans
   * Checks for mirror loans without original loan reference
   */
  private createOrphanMirrorLoansRule(): RuleDefinition {
    return {
      code: 'DATA_ORPHAN_001',
      name: 'No Orphan Mirror Loans',
      description: 'Checks for mirror loans that have no reference to an original loan',
      category: 'DATA_INTEGRITY',
      severity: 'HIGH',
      autoFixable: false,
      requiresApproval: true,
      impactDescription: 'Orphan mirror loans cannot be processed correctly.',
      fixGuidance: 'Either link to an original loan or convert to a regular loan.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Find mirror loans without originalLoanId
        const orphanMirrorLoans = await db.offlineLoan.findMany({
          where: {
            isMirrorLoan: true,
            originalLoanId: null
          },
          include: {
            company: { select: { id: true, name: true } }
          }
        });

        for (const loan of orphanMirrorLoans) {
          issues.push({
            ruleCode: 'DATA_ORPHAN_001',
            entityType: 'OFFLINE_LOAN',
            entityId: loan.id,
            entityIdentifier: loan.loanNumber,
            title: 'Orphan Mirror Loan',
            description: `Loan ${loan.loanNumber} is marked as mirror loan but has no reference to an original loan.`,
            severity: 'HIGH',
            category: 'DATA_INTEGRITY',
            currentState: {
              isMirrorLoan: true,
              originalLoanId: null
            },
            expectedState: {
              isMirrorLoan: true,
              originalLoanId: '[valid original loan ID]'
            },
            suggestedFix: {
              action: 'MANUAL_REVIEW_REQUIRED',
              options: ['Link to original loan', 'Convert to regular loan', 'Delete if duplicate']
            },
            fixDescription: 'Manual review required to determine correct action for this orphan mirror loan.'
          });
        }

        return issues;
      }
    };
  }

  /**
   * Rule: Duplicate Loan Numbers
   * Checks for duplicate loan numbers
   */
  private createDuplicateLoanNumberRule(): RuleDefinition {
    return {
      code: 'DATA_DUPE_001',
      name: 'No Duplicate Loan Numbers',
      description: 'Checks for duplicate loan numbers in the system',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      autoFixable: false,
      requiresApproval: true,
      impactDescription: 'Duplicate loan numbers cause confusion and data integrity issues.',
      fixGuidance: 'Rename one of the loans with a unique number.',
      detect: async () => {
        const issues: DetectedIssue[] = [];

        // Find duplicate loan numbers
        const duplicates = await db.$queryRaw<Array<{ loanNumber: string; count: bigint }>>`
          SELECT loanNumber, COUNT(*) as count
          FROM OfflineLoan
          GROUP BY loanNumber
          HAVING COUNT(*) > 1
        `;

        for (const dup of duplicates) {
          const loans = await db.offlineLoan.findMany({
            where: { loanNumber: dup.loanNumber },
            select: { id: true, loanNumber: true, createdAt: true, company: { select: { name: true } } }
          });

          issues.push({
            ruleCode: 'DATA_DUPE_001',
            entityType: 'OFFLINE_LOAN',
            entityId: loans[0].id,
            entityIdentifier: dup.loanNumber,
            title: 'Duplicate Loan Numbers',
            description: `Found ${dup.count} loans with number ${dup.loanNumber}. Loan numbers must be unique.`,
            severity: 'CRITICAL',
            category: 'DATA_INTEGRITY',
            currentState: {
              duplicateCount: Number(dup.count),
              loanIds: loans.map(l => l.id)
            },
            expectedState: {
              duplicateCount: 1,
              uniqueLoanNumbers: true
            },
            suggestedFix: {
              action: 'RENAME_REQUIRED',
              loanIds: loans.map(l => l.id)
            },
            fixDescription: 'Rename duplicate loans to have unique loan numbers.',
            relatedEntities: loans.map((l, i) => ({
              type: 'OFFLINE_LOAN',
              id: l.id,
              relation: `Duplicate #${i + 1}`
            }))
          });
        }

        return issues;
      }
    };
  }
}

// Export singleton instance
export const rulesEngine = new RulesEngine();
