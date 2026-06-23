# Money Mitra: Final Deep Audit Checklist

This checklist consolidates all critical issues, database transaction failures, UI/scroll glitches, action log bugs, redo subsystem gaps, and orphaned customer ledger metadata found across the Money Mitra codebase.

---

## 1. Undo Subsystem & Transaction Failures

- [ ] **Issue 1: Hard-Deleted Loan Restore Failure on Undo (Process Crash)**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L403)
  * **Description**: Deleting an offline loan hard-deletes it (`db.offlineLoan.delete(...)`). The undo handler uses `tx.offlineLoan.update(...)` to restore status, crashing the process because the record is missing.
  * **Fix**: Use `tx.offlineLoan.create({ data: previousData })` and restore child EMI records if they were archived.

- [ ] **Issue 2: Non-Transactional Background Execution of Mirror Loan Activation**
  * **File**: [src/app/api/loan/start/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/start/route.ts#L366)
  * **Description**: Mirror loan activation cascades run inside a background `setImmediate` thread outside the database transaction, leading to silent synchronization failures.
  * **Fix**: Move mirror loan activation inside the primary `withRetry` transaction block.

- [ ] **Issue 3: Stale Mirror Data and Undo Actions After Payment Success**
  * **File**: [src/components/offline-loan/OfflineLoansList.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineLoansList.tsx#L605)
  * **Description**: Only `fetchLoans()` is called after payment completion. Mappings and Undo/Redo states remain stale.
  * **Fix**: Trigger `fetchMirrorMappings()` and `fetchActionableItems()` alongside `fetchLoans()`.

- [ ] **Issue 4: Loading Skeleton Flickering During List Refetch**
  * **File**: [src/components/offline-loan/OfflineLoansList.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineLoansList.tsx#L135)
  * **Description**: Unconditional loading state overrides the existing list UI on every update.
  * **Fix**: Implement a `silent` fetch option to bypass the loading state during updates.

---

## 2. Mobile Layout, Scroll & Screen Errors

- [ ] **Issue 5: iOS Safari Address Bar Drawer Clipping (`h-screen`)**
  * **File**: [src/components/layout/DashboardLayout.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/layout/DashboardLayout.tsx#L340)
  * **Description**: `h-screen` causes bottom settings and logout links to clip under Safari's address bar.
  * **Fix**: Switch from `h-screen` to `h-[100dvh]` (Dynamic Viewport Height).

- [ ] **Issue 6: Background Page Scroll Leak on Mobile Detail Sheet Open**
  * **File**: [src/components/offline-loan/OfflineLoanDetailPanel.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineLoanDetailPanel.tsx#L1190)
  * **Description**: Page body scrolls underneath the slide-out mobile drawer.
  * **Fix**: Add a body overflow lock (`overflow: hidden`) when the detail drawer mounts and is open.

- [ ] **Issue 7: Column Squishing in Payment Dialog Grids**
  * **File**: [src/components/offline-loan/OfflineEMIPaymentDialog.tsx](file:///c:/Users/bscom/Desktop/reallll/src/components/offline-loan/OfflineEMIPaymentDialog.tsx#L416)
  * **Description**: Fixed `grid-cols-2` and `grid-cols-3` squish components under 375px viewports.
  * **Fix**: Use responsive grid layouts (`grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3`).

---

## 3. Backend & Business Logic Gaps

- [ ] **Issue 8: Mirrored Offline Loan Processing Fee Isolation Failure**
  * **File**: [src/app/api/loan/start/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/start/route.ts#L277)
  * **Description**: Query for processing fee mapping is restricted to `isOfflineLoan: false`, missing offline mirror loans and routing processing fees to the wrong company.
  * **Fix**: Remove `isOfflineLoan: false` constraint when searching for the mirror loan mapping.

- [ ] **Issue 9: One-Sided Foreclosure Sync Query**
  * **File**: [src/app/api/loan/close/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/close/route.ts#L189)
  * **Description**: Foreclosure does not check if the current loan is a mirror (checks only `originalLoanId`), leaving the partner loan open.
  * **Fix**: Match mappings where the loan ID is either `originalLoanId` OR `mirrorLoanId`.

---

## 4. Action Log & Reversion Integrity

- [ ] **Issue 10: Fixed EMI Schedule Deletion during Undo**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L541)
  * **Description**: Reverting a payment deletes the next installment (`installmentNumber + 1`). This is only appropriate for dynamic interest-only loans. In standard fixed-tenure loans, it deletes pre-generated EMIs, corrupting schedules.
  * **Fix**: Restrict EMI schedule deletions strictly to loans where `isInterestOnlyLoan` is true.

- [x] **Issue 11: Reopening Standard Loans as Interest-Only**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L608)
  * **Description**: Undo resets loan status to `INTEREST_ONLY` even if the original loan was a standard EMI loan.
  * **Fix**: Restore loan status using the actual status from the action log's `previousData`.

- [ ] **Issue 12: Credit Transfer Undo Fails to Revert Bank Balances (Silent Failure)**
  * **Files**: [src/app/api/credit-transfer/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/credit-transfer/route.ts#L255) & [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1126)
  * **Description**: Bank transactions are saved with reference ID `CREDIT-TRANSFER-...`, but the undo routine uses `startsWith(userId)`, which fails to match and skip reverting balances.
  * **Fix**: Update the query to locate bank transactions using the correct credit transfer reference ID structure.

- [ ] **Issue 13: Missing Journal Entry Reversal for Credit Transfers**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1088)
  * **Description**: Undo for credit deposits (`user-to-cash` or `user-to-bank`) reverts ledger values but fails to reverse/flag the corresponding double-entry journal entries.
  * **Fix**: Invoke `reverseJournalEntriesForRef(...)` inside the `CREDIT_TRANSFER` undo block.

- [ ] **Issue 14: Dual-Credit Desynchronization**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L967)
  * **Description**: Undo/Redo blocks increment/decrement cashier credit using the legacy `credit` field, completely bypassing the dual-credit `companyCredit` and `personalCredit` columns.
  * **Fix**: Update credit balances targeting specific columns according to the payment's `creditType`.

- [ ] **Issue 15: Partial Reversions Leave Stale Principal/Interest Data**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1001)
  * **Description**: Resetting payment states on EMI reversion clears `paidAmount` but leaves `paidPrincipal` and `paidInterest` dirty, corrupting subsequent interest computations.
  * **Fix**: Reset `paidPrincipal` and `paidInterest` back to `0` (or their archived states) on rollback.

- [ ] **Issue 16: Missing Processing Fee Syncing on Mirror Loans**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L865)
  * **Description**: Processing fee journal entries are registered under the mirror loan ID, but the undo routine attempts deletions using only the original loan ID.
  * **Fix**: Ensure the undo action looks up and deletes fee journals matching both original and mirror loan IDs.

- [ ] **Issue 17: Unlogged Critical Financial Operations**
  * **File**: [src/app/api/credit-transfer/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/credit-transfer/route.ts)
  * **Description**: Direct ledger transfers (`user-to-cash`, `add-cash`, `add-to-bank`) do not create `ActionLog` entries, creating an auditing gap.
  * **Fix**: Create a corresponding `ActionLog` record in every credit transfer endpoint.

---

## 5. Redo System Deficiencies

- [ ] **Issue 18: Incomplete Redo Logic & Ledger Desynchronization**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts#L1145)
  * **Description**: Redoing payments changes records to paid status but does NOT recreate the deleted bank transactions, cashbook logs, or double-entry journals, causing permanent balance sheets desynchronization.
  * **Fix**: Re-execute the accounting methods (creating journals and posting cashbook/bank entries) inside the redo branch.

- [ ] **Issue 19: Missing Redo Paths for Major Modules**
  * **File**: [src/app/api/action-log/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/action-log/route.ts)
  * **Description**: Redo blocks are completely missing for `ONLINE_LOAN`, `PAYMENT`, `SETTLEMENT`, `EXPENSE`, and `CREDIT_TRANSFER` modules (returning a mock success instead of executing roll-forward actions).
  * **Fix**: Build proper redo pathways recreating records and journal items for each missing module.

---

## 6. Orphaned Customer Ledgers & Missing Metadata

- [ ] **Issue 20: Missing Customer & Loan Metadata on Foreclosure Journals**
  * **File**: [src/app/api/loan/close/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/close/route.ts#L747) & [L852](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/close/route.ts#L852)
  * **Description**: During foreclosure, the double-entry lines generated for bank/cash, loans receivable, accrued interest, overdue interest, and foreclosure fee do not pass `loanId` and `customerId`.
  * **Fix**: Update both the original and mirror foreclosure lines to explicitly pass `loanId` and `customerId`.

- [ ] **Issue 21: Missing Customer Metadata on Interest Payment Journals**
  * **File**: [src/app/api/loan/interest-payment/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/loan/interest-payment/route.ts#L353)
  * **Description**: Interest payment journal entries correctly record `loanId` but omit `customerId` on all lines.
  * **Fix**: Append `customerId: loan.customerId` to both debit and credit journal lines in the accounting block.

- [ ] **Issue 22: Missing Customer Metadata on Offline Interest-Only Journals**
  * **File**: [src/app/api/offline-loan/route.ts](file:///c:/Users/bscom/Desktop/reallll/src/app/api/offline-loan/route.ts#L2510)
  * **Description**: Offline interest-only collections pass `loanId: targetLoanId` to the ledger entries but leave `customerId` completely blank.
  * **Fix**: Explicitly pass `customerId: targetCustomerId` (which resolves to `loan.customerId || ...`) on all debit and credit lines.

- [ ] **Issue 23: Missing Customer Metadata on Principal-Only Journals**
  * **File**: [src/lib/simple-accounting.ts](file:///c:/Users/bscom/Desktop/reallll/src/lib/simple-accounting.ts#L1248)
  * **Description**: `recordPrincipalOnlyJournal` does not have a `customerId` parameter and leaves `customerId` as `null` on all double-entry lines, breaking customer ledger reports.
  * **Fix**: Add `customerId?: string` to `recordPrincipalOnlyJournal` params and assign it to the created journal lines.
