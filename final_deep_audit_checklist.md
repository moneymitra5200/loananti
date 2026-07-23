# Money Mitra: Final Deep Audit Checklist

This checklist consolidates all critical issues, database transaction failures, UI/scroll glitches, action log bugs, redo subsystem gaps, and orphaned customer ledger metadata found across the Money Mitra codebase.

---

## 1. Undo Subsystem & Transaction Failures

- [x] **Issue 1: Hard-Deleted Loan Restore Failure on Undo (Process Crash)** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L403)
  * **Description**: Deleting an offline loan hard-deletes it (`db.offlineLoan.delete(...)`). The undo handler uses `tx.offlineLoan.update(...)` to restore status, crashing the process because the record is missing.
  * **Fix**: Use `tx.offlineLoan.create({ data: previousData })` and restore child EMI records if they were archived.

- [x] **Issue 2: Non-Transactional Background Execution of Mirror Loan Activation** ✅ RESOLVED
  * **File**: [src/app/api/loan/start/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/start/route.ts#L366)
  * **Description**: Mirror loan activation cascades run inside a background `setImmediate` thread outside the database transaction, leading to silent synchronization failures.
  * **Fix**: Move mirror loan activation inside the primary `withRetry` transaction block.

- [x] **Issue 3: Stale Mirror Data and Undo Actions After Payment Success** ✅ RESOLVED
  * **File**: [src/components/offline-loan/OfflineLoansList.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineLoansList.tsx#L605)
  * **Description**: Only `fetchLoans()` is called after payment completion. Mappings and Undo/Redo states remain stale.
  * **Fix**: Trigger `fetchMirrorMappings()` and `fetchActionableItems()` alongside `fetchLoans()`.

- [x] **Issue 4: Loading Skeleton Flickering During List Refetch** ✅ RESOLVED
  * **File**: [src/components/offline-loan/OfflineLoansList.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineLoansList.tsx#L135)
  * **Description**: Unconditional loading state overrides the existing list UI on every update.
  * **Fix**: Implement a `silent` fetch option to bypass the loading state during updates.

---

## 2. Mobile Layout, Scroll & Screen Errors

- [x] **Issue 5: iOS Safari Address Bar Drawer Clipping (`h-screen`)** ✅ RESOLVED
  * **File**: [src/components/layout/DashboardLayout.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/layout/DashboardLayout.tsx#L340)
  * **Description**: `h-screen` causes bottom settings and logout links to clip under Safari's address bar.
  * **Fix**: Switch from `h-screen` to `h-[100dvh]` (Dynamic Viewport Height).

- [x] **Issue 6: Background Page Scroll Leak on Mobile Detail Sheet Open** ✅ RESOLVED
  * **File**: [src/components/offline-loan/OfflineLoanDetailPanel.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineLoanDetailPanel.tsx#L1190)
  * **Description**: Page body scrolls underneath the slide-out mobile drawer.
  * **Fix**: Add a body overflow lock (`overflow: hidden`) when the detail drawer mounts and is open.

- [x] **Issue 7: Column Squishing in Payment Dialog Grids** ✅ RESOLVED
  * **File**: [src/components/offline-loan/OfflineEMIPaymentDialog.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineEMIPaymentDialog.tsx#L416)
  * **Description**: Fixed `grid-cols-2` and `grid-cols-3` squish components under 375px viewports.
  * **Fix**: Use responsive grid layouts (`grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3`).

---

## 3. Backend & Business Logic Gaps

- [x] **Issue 8: Mirrored Offline Loan Processing Fee Isolation Failure** ✅ RESOLVED
  * **File**: [src/app/api/loan/start/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/start/route.ts#L277)
  * **Description**: Query for processing fee mapping is restricted to `isOfflineLoan: false`, missing offline mirror loans and routing processing fees to the wrong company.
  * **Fix**: Remove `isOfflineLoan: false` constraint when searching for the mirror loan mapping.

- [x] **Issue 9: One-Sided Foreclosure Sync Query** ✅ RESOLVED
  * **File**: [src/app/api/loan/close/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/close/route.ts#L189)
  * **Description**: Foreclosure does not check if the current loan is a mirror (checks only `originalLoanId`), leaving the partner loan open.
  * **Fix**: Match mappings where the loan ID is either `originalLoanId` OR `mirrorLoanId`.

---

## 4. Action Log & Reversion Integrity

- [x] **Issue 10: Fixed EMI Schedule Deletion during Undo** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L541)
  * **Description**: Reverting a payment deletes the next installment (`installmentNumber + 1`). This is only appropriate for dynamic interest-only loans. In standard fixed-tenure loans, it deletes pre-generated EMIs, corrupting schedules.
  * **Fix**: Restrict EMI schedule deletions strictly to loans where `isInterestOnlyLoan` is true.

- [x] **Issue 11: Reopening Standard Loans as Interest-Only**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L608)
  * **Description**: Undo resets loan status to `INTEREST_ONLY` even if the original loan was a standard EMI loan.
  * **Fix**: Restore loan status using the actual status from the action log's `previousData`.

- [x] **Issue 12: Credit Transfer Undo Fails to Revert Bank Balances (Silent Failure)** ✅ RESOLVED
  * **Files**: [src/app/api/credit-transfer/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/credit-transfer/route.ts#L255) & [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1126)
  * **Description**: Bank transactions are saved with reference ID `CREDIT-TRANSFER-...`, but the undo routine uses `startsWith(userId)`, which fails to match and skip reverting balances.
  * **Fix**: Update the query to locate bank transactions using the correct credit transfer reference ID structure.

- [x] **Issue 13: Missing Journal Entry Reversal for Credit Transfers** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1088)
  * **Description**: Undo for credit deposits (`user-to-cash` or `user-to-bank`) reverts ledger values but fails to reverse/flag the corresponding double-entry journal entries.
  * **Fix**: Invoke `reverseJournalEntriesForRef(...)` inside the `CREDIT_TRANSFER` undo block.

- [x] **Issue 14: Dual-Credit Desynchronization** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L967)
  * **Description**: Undo/Redo blocks increment/decrement cashier credit using the legacy `credit` field, completely bypassing the dual-credit `companyCredit` and `personalCredit` columns.
  * **Fix**: Update credit balances targeting specific columns according to the payment's `creditType`.

- [x] **Issue 15: Partial Reversions Leave Stale Principal/Interest Data** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1001)
  * **Description**: Resetting payment states on EMI reversion clears `paidAmount` but leaves `paidPrincipal` and `paidInterest` dirty, corrupting subsequent interest computations.
  * **Fix**: Reset `paidPrincipal` and `paidInterest` back to `0` (or their archived states) on rollback.

- [x] **Issue 16: Missing Processing Fee Syncing on Mirror Loans** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L865)
  * **Description**: Processing fee journal entries are registered under the mirror loan ID, but the undo routine attempts deletions using only the original loan ID.
  * **Fix**: Ensure the undo action looks up and deletes fee journals matching both original and mirror loan IDs.

- [x] **Issue 17: Unlogged Critical Financial Operations** ✅ RESOLVED
  * **File**: [src/app/api/credit-transfer/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/credit-transfer/route.ts)
  * **Description**: Direct ledger transfers (`user-to-cash`, `add-cash`, `add-to-bank`) do not create `ActionLog` entries, creating an auditing gap.
  * **Fix**: Create a corresponding `ActionLog` record in every credit transfer endpoint.

---

## 5. Redo System Deficiencies

- [x] **Issue 18: Incomplete Redo Logic & Ledger Desynchronization** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1145)
  * **Description**: Redoing payments changes records to paid status but does NOT recreate the deleted bank transactions, cashbook logs, or double-entry journals, causing permanent balance sheets desynchronization.
  * **Fix**: Re-execute the accounting methods (creating journals and posting cashbook/bank entries) inside the redo branch.

- [x] **Issue 19: Missing Redo Paths for Major Modules** ✅ RESOLVED
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts)
  * **Description**: Redo blocks are completely missing for `ONLINE_LOAN`, `PAYMENT`, `SETTLEMENT`, `EXPENSE`, and `CREDIT_TRANSFER` modules (returning a mock success instead of executing roll-forward actions).
  * **Fix**: Build proper redo pathways recreating records and journal items for each missing module.

---

## 6. Orphaned Customer Ledgers & Missing Metadata

- [x] **Issue 20: Missing Customer & Loan Metadata on Foreclosure Journals** ✅ RESOLVED
  * **File**: [src/app/api/loan/close/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/close/route.ts#L747) & [L852](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/close/route.ts#L852)
  * **Description**: During foreclosure, the double-entry lines generated for bank/cash, loans receivable, accrued interest, overdue interest, and foreclosure fee did not pass `loanId` and `customerId`.
  * **Resolution**: Updated both original and mirror foreclosure lines to explicitly pass `loanId` and `customerId`. Confirmed via `audit_journal_entries.js` — zero `EMI_PAYMENT`/`OFFLINE_LOAN_FORECLOSURE` lines missing metadata.

- [x] **Issue 21: Missing Customer Metadata on Interest Payment Journals** ✅ RESOLVED
  * **File**: [src/app/api/loan/interest-payment/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/interest-payment/route.ts#L353)
  * **Description**: Interest payment journal entries correctly recorded `loanId` but omitted `customerId` on all lines.
  * **Resolution**: Appended `customerId: loan.customerId` to both debit and credit journal lines in the accounting block.

- [x] **Issue 22: Missing Customer Metadata on Offline Interest-Only Journals** ✅ RESOLVED
  * **File**: [src/app/api/offline-loan/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/offline-loan/route.ts#L3953)
  * **Description**: Offline EMI fallback journal and penalty income journals left `customerId` blank.
  * **Resolution**: Injected `customerId` into both the fallback journal lines (L3955-3960) and penalty collection journal lines (L4110-4112).

- [x] **Issue 23: Missing Customer Metadata on Principal-Only Journals** ✅ RESOLVED
  * **File**: [src/lib/simple-accounting.ts](file:///c:/Users/bscom/Desktop/reallll/src/lib/simple-accounting.ts#L1193)
  * **Description**: `recordPrincipalOnlyJournal` lacked a `customerId` parameter.
  * **Resolution**: Added `customerId: string` as a **mandatory** parameter with runtime validation. All 4 journal lines (Dr Cash/Bank, Cr Loans Receivable, Dr Irrecoverable Debt, Cr Interest/Receivable) now carry `customerId` and `loanId`. Call sites in offline-loan/route.ts also updated.

- [x] **Issue 24: Missing loanId/customerId on EMI Payment Debit Lines** ✅ RESOLVED
  * **File**: [src/lib/accounting-service.ts](file:///c:/Users/bscom/Desktop/reallll/src/lib/accounting-service.ts#L923)
  * **Description**: `recordEMIPayment` in AccountingService had `loanId`/`customerId` on credit lines but not on the debit (cash/bank) line.
  * **Resolution**: Added `loanId: params.loanId` and `customerId: params.customerId` to the debit journal line.

- [x] **Issue 25: Missing loanId/customerId on Processing Fee Collection Debit Line** ✅ RESOLVED
  * **File**: [src/lib/accounting-service.ts](file:///c:/Users/bscom/Desktop/reallll/src/lib/accounting-service.ts#L1183)
  * **Description**: `recordProcessingFeeCollection` had metadata on the credit (receivable cleared) line but not on the debit (cash/bank received) line.
  * **Resolution**: Added `loanId: params.loanId` and `customerId: params.customerId` to the debit line.

- [x] **Issue 26: Missing loanId/customerId on Mirror Interest Income and Foreclosure Debit Lines** ✅ RESOLVED
  * **File**: [src/lib/accounting-service.ts](file:///c:/Users/bscom/Desktop/reallll/src/lib/accounting-service.ts#L1309)
  * **Description**: `recordMirrorInterestIncome` and `recordForeclosure` debit (cash/bank) lines had no `loanId`/`customerId`.
  * **Resolution**: Added metadata to both debit lines in `recordMirrorInterestIncome` (L1309) and `recordForeclosure` (L1481).

---

## 7. Remaining DB-Level Legacy Gaps (Pre-Hardening Records)

> **Note**: The following reference types show missing metadata in the current database due to records created *before* the audit hardening. The code paths are now fully fixed — new entries will be compliant. Legacy records require a one-time data backfill.

| `referenceType` | Missing Lines | Root Cause |
|---|---|---|
| `EQUITY_INVESTMENT` | 6 | Capital injection entries — no loan or customer context by design |
| `MIRROR_LOAN_DISBURSEMENT` | 1 | Legacy record from before metadata injection in disbursement path |
| `PROCESSING_FEE_ACCRUAL` | 1 | Legacy record from before `recordProcessingFeeAccrual` had full metadata |

> `EQUITY_INVESTMENT` entries intentionally have no `loanId`/`customerId` — they represent company-level capital events, not customer loan transactions. These should be excluded from customer ledger audit queries.
