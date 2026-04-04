# Work Log - Loan Management System

---
Task ID: 1
Task: Fix offline loan EMI generation and add Interest Only / Mirror Loan support

Work Log:
- Fixed EMI generation logic in `/api/offline-loan/route.ts`
- Added proper EMI calculation using standard amortization formula
- Added Interest Only loan support with monthly interest calculation
- Added Mirror Loan checkbox and integration
- Updated OfflineLoanForm with Interest Only and Mirror Loan options
- Updated OfflineLoanDetailPanel with Interest EMI tab for Interest Only loans

Stage Summary:
- EMI generation now uses proper formula: `P * r * (1+r)^n / ((1+r)^n - 1)`
- Interest Only loans create with status 'INTEREST_ONLY' and no EMIs initially
- Monthly interest amount calculated as: `(principal * rate / 100) / 12`
- Mirror Loan creates pending mirror loan entry for approval

---
Task ID: 2
Task: Add Admin Ticket Management Panel

Work Log:
- Created `/components/tickets/AdminTicketPanel.tsx`
- Ticket listing with status, category, priority filters
- Ticket detail view with message thread
- Status update and assignment functionality
- Internal notes support

Stage Summary:
- Full ticket management UI for Super Admin
- Stats cards showing Open, In Progress, Resolved counts
- Message thread with customer/admin distinction
- Quick actions for status change and assignment

---
Task ID: 3
Task: Add In-App Live Chat system

Work Log:
- Created `/api/live-chat/route.ts` - Session management
- Created `/api/live-chat/sessions/route.ts` - List sessions
- Created `/api/live-chat/[sessionId]/messages/route.ts` - Messages API
- Created `/components/chat/AdminLiveChatPanel.tsx` - Admin chat UI

Stage Summary:
- Real-time chat system with polling (5-second interval)
- Session status: WAITING, ACTIVE, CLOSED
- Auto-assignment when admin clicks on waiting chat
- Message history with customer/admin distinction

---
Task ID: 4
Task: Fix offline loan EMI schedule showing wrong amounts - Add FLAT/REDUCING interest type support

Work Log:
- Added `interestType` field to OfflineLoan Prisma schema (default: "FLAT")
- Updated `/api/offline-loan/route.ts` to use `calculateEMI()` helper from utils/helpers
- Updated `/api/offline-loan/start/route.ts` to use proper EMI calculation with interest type support
- Updated `/api/loan/all-active/route.ts` to include INTEREST_ONLY status offline loans
- Updated `OfflineLoanForm.tsx` with Interest Type selector (FLAT/REDUCING)
- Updated EMI calculation in form to support both interest types
- Ran `bun run db:push` to sync schema changes

Stage Summary:
- Offline loans now support FLAT and REDUCING interest types
- FLAT interest: Same principal/interest for each EMI (Total Interest = P × R × T / 1200)
- REDUCING interest: Variable principal/interest per EMI based on outstanding balance
- Offline loans now appear in Active Loans section (including INTEREST_ONLY status)
- Interest Type selector added to offline loan creation form
- Default interest type is FLAT for all new offline loans
- EMI schedule now shows proper breakdown (Principal + Interest) per EMI

---
Task ID: 5
Task: Add EMI date shifting logic for partial payments in offline loans

Work Log:
- Analyzed existing partial payment flow in `/api/offline-loan/route.ts`
- Implemented date shifting logic after partial payment with remainingPaymentDate
- Added logic to shift current EMI's due date to remainingPaymentDate
- Added logic to shift ALL subsequent EMIs to the same day of their respective months
- Added handling for month overflow (e.g., day 31 in February uses last day of month)
- Preserved originalDueDate for audit trail

Stage Summary:
- When partial payment is made with remainingPaymentDate:
  - Current EMI's due date shifts to remainingPaymentDate
  - All subsequent EMIs shift to the same day of their respective months
- Example: EMI 1 due Jan 1, partial paid on Jan 5
  → EMI 1 shifts to Jan 5, EMI 2 shifts to Feb 5, EMI 3 shifts to Mar 5
- Month overflow handled gracefully (day 31 in Feb → Feb 28/29)
- originalDueDate preserved for audit purposes
- Commit: 872056f

---
Task ID: 6
Task: Update offline loan Interest Only logic to match online loan

Work Log:
- Analyzed online loan Interest Only payment logic in `/api/emi/route.ts`
- Compared with offline loan Interest Only logic
- Identified key difference: Online uses SAME interest amount, Offline was calculating NEW interest
- Updated offline loan logic to use SAME interest amount as original EMI

Stage Summary:
- Offline loan Interest Only now matches online loan logic exactly
- NEW EMI created with:
  - Principal: Same as original EMI's principal (deferred)
  - Interest: Same as original EMI's interest (NOT recalculated)
  - Total: Principal + Interest (same as original EMI total)
- Example: Original EMI #1: Principal ₹8,000 + Interest ₹2,000 = Total ₹10,000
  - Customer pays Interest Only ₹2,000
  - NEW EMI #2: Principal ₹8,000 + Interest ₹2,000 = Total ₹10,000
- Commit: 7ceff0f

---
Task ID: 7
Task: Fix build error - Remove nextPaymentDate from OfflineLoanEMI update

Work Log:
- Build failed with error: 'nextPaymentDate' does not exist in OfflineLoanEMI model
- The field exists in EMISchedule (online loans) but not in OfflineLoanEMI (offline loans)
- Removed the field from partial payment date shifting logic

Stage Summary:
- Build now passes successfully
- Commit: 63dbfef

---
Task ID: 8
Task: Add sequential EMI payment and Pay button for offline loans

Work Log:
- Added sequential payment check in `openPaymentDialog` function
- EMI can only be paid if all previous EMIs are PAID or INTEREST_ONLY_PAID
- Added proper "Pay" button in EMI list (replaced click-on-row interaction)
- Added "Locked" badge for EMIs that cannot be paid yet
- Added visual indicators for locked/unlocked EMIs
- INTEREST_ONLY_PAID status is now considered as "handled" - unlocks next EMI

Stage Summary:
- EMI Payment Order enforced: Can only pay EMI 2 after EMI 1 is paid/interest-only-paid
- Pay button added with proper enable/disable states
- Locked EMIs appear grayed out with "Locked" badge
- Build passes successfully
- Commit: 92242b0

---
Task ID: 9
Task: Fix Interest Only loan payment flow for customers

Work Log:
- Updated interest-emi API (`/api/interest-emi/route.ts`) to properly create interest EMIs
- Fixed audit log to remove non-existent `newData` field
- Updated customer loan detail page (`CustomerLoanDetailPage.tsx`) to handle both INTEREST_ONLY and ACTIVE_INTEREST_ONLY statuses
- Interest Only badge now shows correctly in loan header
- Interest EMI section displays with proper Pay button
- After paying interest, next month's EMI is auto-generated

Stage Summary:
- Customer can now see Interest Only loan properly with payment option
- Status badge shows "Interest Only" for interest-only loans
- Monthly interest payment section shows with Pay button
- Payment history shows all interest payments made
- Same flow works for both online and offline interest-only loans
- Build passes successfully
- Commit: b745f07

---
Task ID: 10
Task: Fix Interest Only loan - create first EMI on disbursement

Work Log:
- Fixed loan start API error - was checking wrong status
- Added logic in workflow/approve to create first interest EMI when interest-only loan is disbursed
- Updated customer loan detail page to properly check for ACTIVE_INTEREST_ONLY status
- First interest EMI is now auto-created with due date 1 month after disbursement

Stage Summary:
- When interest-only loan is disbursed, first interest EMI is automatically created
- Customer now sees Pay Interest option immediately after loan disbursement
- Interest EMI due date is set to 5th of next month
- Status badge shows "Interest Only" for ACTIVE_INTEREST_ONLY loans
- Build passes successfully
- Commit: 42524c0

---
Task ID: 11
Task: Hide settings option from customers and show original loan details

Work Log:
- Removed Settings button from CustomerDashboard.tsx profile section
- Removed EMI Settings icon from CustomerLoanDetailPage.tsx 
- Removed EMISettingsDialog import and usage from customer loan detail page
- Verified customers see original loan details (not mirror loan details)
- Verified STAFF role EMI payment handling in API is correct

Stage Summary:
- Customers can no longer see or access the Settings option
- Customers can no longer see EMI Settings icons for individual EMIs
- Customers see their original loan details (loan list fetches by customerId directly)
- STAFF role EMI payment code verified - uses proper role field mapping
- Commit: 611aa44

---
Task ID: 12
Task: Filter out mirror loans from customer view

Work Log:
- Updated loan list API (`/api/loan/list/route.ts`) to filter out mirror loans for CUSTOMER role
- Added where clause: `where.NOT = { mirrorLoanMappings: { some: {} } }`
- This ensures customers only see their original loans,- Verified EMI API returns schedules for the correct loanId (no mirror loan logic in GET endpoint)

Stage Summary:
- Customers now see only ORIGINAL loans, not mirror loans
- The loan list API filters out loans that have mirrorLoanMappings (indicating they are mirror loans)
- EMI schedules are fetched by the exact loanId passed
- Commit: e103267

---
Task ID: 13
Task: Remove Loan Details section from customer loan detail page

Work Log:
- Removed the Loan Details card from CustomerLoanDetailPage.tsx
- Removed interest rate, tenure, EMI amount, total interest, total amount, processing fee display
- Removed lender (company) information display
- Customer now sees only EMI schedule and payment options

Stage Summary:
- Customer loan detail page now shows only EMI-related information
- Removed loan details section that showed internal loan parameters
- Cleaner interface focused on payment functionality
- Commit: ddebc68

---
Task ID: 14
Task: Implement advance EMI payment logic - Principal only for advance payments

Work Log:
- Added advance payment detection logic in `/api/emi/pay/route.ts` for online loans
- Added advance payment detection logic in `/api/offline-loan/route.ts` for offline loans
- Implemented month comparison: current month vs EMI due date month
- Updated `EMIPaymentDialog.tsx` with advance payment UI and savings display
- Updated `OfflineLoanDetailPanel.tsx` with multi-EMI advance payment support
- Added clear visual indicators for advance vs regular payments

Stage Summary:
- **Advance Payment Rule**: If EMI due date month > current month → collect ONLY PRINCIPAL
- **Regular Payment Rule**: If EMI due date month ≤ current month → collect PRINCIPAL + INTEREST
- Example: EMI due in June, paid in May = Principal only (no interest)
- UI shows "Advance Payment - Principal Only" with savings amount
- Works for both online and offline loan EMI payments
- Multi-EMI selection also supports advance payment logic
- Commit: 6c38ab1
- Deployed to Vercel (auto-deploy from GitHub)

---
Task ID: 15
Task: Implement New Credit Management System & Simplified Accountant Portal

Work Log:
- Updated `/lib/accounting-service.ts` with new credit system methods:
  - `recordPersonalCreditEMIPayment` - Entry in Company 3 Cashbook (Personal Credit)
  - `recordCompanyCreditOnlineEMIPayment` - Entry in Loan Company's Bank Account
  - `recordCompanyCreditCashEMIPayment` - Entry in Loan Company's Cashbook
  - `recordMirrorLoanEMIPayment` - Full mirror amounts (NOT difference)
  - `recordExtraEMIPayment` - Extra EMI after mirror tenure
  - `recordLoanDisbursementEntry` - Disbursement with mirror/no-mirror logic
- Created new `SimplifiedAccountantDashboard.tsx` with required sections:
  - Company 1 & 2: Profit & Loss, Balance Sheet, Bank Accounts, Cash Flow, Daybook, Cashbook
  - Company 3: Cash Flow, Daybook, Cashbook (no bank account)
- Created `/api/accountant/cashbook/route.ts` API for cashbook data
- Updated `EMIPaymentDialog.tsx` with new credit type selection:
  - Personal Credit (CASH only, Company 3 Cashbook)
  - Company Credit (ONLINE → Bank, CASH → Cashbook)
- Updated `/app/page.tsx` to use new SimplifiedAccountantDashboard

Stage Summary:
- **Personal Credit**: CASH only, entry in Company 3 Cashbook, used for Extra EMIs with Secondary Payment Page
- **Company Credit ONLINE**: Entry in Loan Company's Bank Account
- **Company Credit CASH**: Entry in Loan Company's Cashbook
- **Mirror Loan Accounting**: Full mirror EMI amounts, NOT the difference
- **Extra EMI**: Full amount is profit for Company 3
- **Company 3 Disbursement**: Uses Cashbook (no bank account)
- **Simplified Accountant Portal**: Only required sections based on company type

---
Task ID: 16
Task: Wire Accounting Entries to EMI Payment Flow

Work Log:
- Created `/lib/simple-accounting.ts` - Simple accounting helper with:
  - `getOrCreateCashBook()` - Get or create cashbook for a company
  - `recordCashBookEntry()` - Record cash in/out entries
  - `getDefaultBankAccount()` - Get company's default bank account
  - `recordBankTransaction()` - Record bank transactions
  - `recordEMIPaymentAccounting()` - Main function for EMI payment accounting
  - `getCompany3Id()` - Get Company 3 ID for personal credit
- Integrated accounting into `/api/offline-loan/route.ts`:
  - Added import for accounting helper
  - Added accounting entry call after successful EMI payment
  - Handles credit type (PERSONAL → Company 3, COMPANY → Loan Company)
  - Handles payment mode (ONLINE → Bank, CASH → Cashbook)
- Integrated accounting into `/api/emi/pay/route.ts`:
  - Added import for accounting helper
  - Added accounting entry call after successful EMI payment
  - Handles mirror loan accounting entries
- Fixed TypeScript errors:
  - Added `grandTotal: 0` to early return in `getAdvancePaymentBreakdown()`
  - Added `MIRROR_EMI_PAYMENT` and `EXTRA_EMI_PAYMENT` to JournalEntryType
  - Fixed null vs undefined type issues

Stage Summary:
- **Accounting Flow Wired**: EMI payments now automatically create accounting entries
- **Personal Credit**: Records to Company 3 Cashbook
- **Company Credit ONLINE**: Records to Loan Company's Bank Account
- **Company Credit CASH**: Records to Loan Company's Cashbook
- **Mirror Loan**: Full mirror amounts recorded in mirror company's books
- Build passes, lint passes

---
Task ID: 17
Task: Restrict Mirror Loans to Company 3 ONLY

Work Log:
- Updated `/api/mirror-loan/route.ts`:
  - Added `isCompany3()` helper function to check if company is Company 3
  - Added `getCompany3Id()` helper function to get Company 3 ID
  - Added validation in POST handler - rejects mirror loan if original loan not from Company 3
  - Added validation in ensure-mapping action - rejects mirror if loan not from Company 3
  - Returns clear error message explaining why mirror is not allowed
- Updated `/api/offline-loan/route.ts`:
  - Added validation when creating offline loan with mirror option
  - Checks if company is Company 3 before allowing mirror loan
  - Returns error with explanation if mirror requested for non-Company 3 loan
- Updated `OfflineLoanForm.tsx`:
  - Added `isSelectedCompany3()` helper function
  - Mirror loan checkbox ONLY shows when Company 3 is selected
  - Added info message explaining mirror loan is only for Company 3
  - Auto-reset mirror loan state when company changes to non-Company 3
  - Added `createdAt` to Company interface for sorting

Stage Summary:
- **CRITICAL RULE**: Mirror loans can ONLY be created for Company 3 loans
- Company 1 loans → NO mirror loans allowed
- Company 2 loans → NO mirror loans allowed  
- Company 3 loans → CAN have mirror loans (to Company 1 or Company 2)
- UI shows info message when non-Company 3 is selected
- Backend validates and rejects mirror requests for non-Company 3
- Build passes, lint passes
- Pushed to Git: e62fa84
- Deployed to Vercel (auto-deploy from GitHub)

---
Task ID: 18
Task: Implement Data Integrity System & Verify EMI Payment Mode Selection

Work Log:
- Verified EMI Payment Dialog already has proper credit type selection:
  - `EMIPaymentDialog.tsx` - Shows Personal Credit vs Company Credit selection
  - `OfflineEMIPaymentDialog.tsx` - Same selection for offline loans
  - Auto-switches credit type based on payment mode (CASH → COMPANY, others → PERSONAL)
- Verified Loan Delete API (`/api/loan/delete/route.ts`) handles cascade delete:
  - Deletes CashBook entries when loan is deleted
  - Deletes Bank transactions when loan is deleted
  - Deletes all related records (EMIs, Credit Transactions, Mirror mappings)
  - Handles both online and offline loans
- Verified Data Integrity API (`/api/system/data-integrity/route.ts`):
  - Checks for orphan CashBook entries
  - Checks for orphan Bank transactions
  - Checks for orphan Credit transactions
  - Checks for missing accounting entries for paid EMIs
  - Checks company-wise data integrity
  - Auto-fixes issues when `autoFix=true` parameter is passed
- Created `/mini-services/integrity-check-service/` - Daily integrity check service:
  - Runs automatically at 2 AM every day
  - Checks and fixes orphan transactions
  - Creates missing CashBooks for companies
  - Logs results to audit log

Stage Summary:
- **EMI Payment Mode Selection**: Already implemented and working
  - Personal Credit: CASH → Company 3 Cashbook
  - Company Credit: ONLINE → Loan Company's Bank, CASH → Loan Company's Cashbook
- **Data Integrity**: Fully implemented with:
  - Cascade delete when loan is deleted
  - Daily auto-check service
  - Manual trigger via API endpoint
- **Frontend-Accounting Consistency**: 
  - When loan deleted → All transactions deleted
  - When transaction orphan → Auto-deleted
  - When loan has no transaction → Transaction created (for paid EMIs)

---
Task ID: 19
Task: Fix EMI Payment Dialog - Correct Credit Type & Payment Mode Flow

Work Log:
- Updated `EMIPaymentDialog.tsx` (Online Loans):
  - Removed old flow (Payment Mode → Auto Credit Type)
  - Added new flow (Credit Type → Payment Mode)
  - Personal Credit: Only CASH option, fixed to Company 3 Cashbook
  - Company Credit: ONLINE (Bank) or CASH (Cashbook) of loan company
- Updated `OfflineEMIPaymentDialog.tsx` (Offline Loans):
  - Same flow as online loan dialog
  - Personal Credit: CASH only → Company 3 Cashbook
  - Company Credit: ONLINE/CASH → Loan Company's books
- Verified `simple-accounting.ts` already matches the correct flow

Stage Summary:
- **Personal Credit**: 
  - Only CASH payment allowed
  - Entry ALWAYS goes to Company 3 Cashbook
  - No bank entry
- **Company Credit ONLINE**: 
  - Entry goes to Loan Company's Bank Account
- **Company Credit CASH**: 
  - Entry goes to Loan Company's Cashbook
- Commit: db4a45d
- Pushed to Git

---
Task ID: 20
Task: Fix EMI Payment Dialog for Company 3 Non-Mirrored Loans

Work Log:
- Updated `OfflineLoanDetailPanel.tsx`:
  - Added `isMirrored` field to LoanDetail interface
  - Added `isCompany3NonMirroredLoan` helper to check if loan is from Company 3 AND not mirrored
  - Updated Credit Type selection to show correct info for Company 3 non-mirrored loans
    - Personal Credit: CASH only → Company 3 Cashbook
    - Company Credit: CASH only → Company 3 Cashbook (no ONLINE option since Company 3 has no bank account)
  - Updated Payment Mode section to conditionally show ONLINE/CASH options
    - For Company 3 non-mirrored: Shows fixed CASH only with explanation message
    - For other companies: Shows ONLINE and CASH options as before
- Updated `/api/offline-loan/route.ts`:
  - Added `code` field to company select in loan detail fetch
  - Added mirror loan mapping check to determine `isMirrored` status
  - Returns `isMirrored` field in loan response

Stage Summary:
- **Company 3 Non-Mirrored Loan Payment Flow**:
  - Personal Credit: CASH → Company 3 Cashbook
  - Company Credit: CASH only → Company 3 Cashbook (NO ONLINE option)
- **Normal Company (1/2) or Mirrored Loan Payment Flow**:
  - Personal Credit: CASH → Company 3 Cashbook
  - Company Credit: ONLINE → Loan Company's Bank Account, CASH → Loan Company's Cashbook
- **Key Rule**: Company 3 has NO bank account, so all payments go to Cashbook only
- Commit: ca86178
- Pushed to Git and deployed to Vercel

---
Task ID: 21
Task: Add UPI ID, Bank Details, and QR Code to Bank Account + Verify Payment Flows

Work Log:
- Updated `SimplifiedAccountantDashboard.tsx`:
  - Added state variables for IFSC Code, Branch Name, Account Type, UPI ID, QR Code
  - Updated `handleAddBankAccount` to handle QR code upload
  - Updated Add Bank Account dialog with:
    - Bank Details Section: Bank Name, Branch Name, Account Number, IFSC Code, Account Holder Name, Account Type, Opening Balance
    - Payment Display Section: UPI ID, QR Code Image Upload
  - Updated `BankAccountsSection` to display UPI ID and QR Code for each account
  - Updated `BankAccount` and `BankTransaction` interfaces
- Verified EMI Payment Accounting Flows:
  - `/api/emi/pay/route.ts` calls `recordEMIPaymentAccounting` for all EMI payments
  - `/api/offline-loan/route.ts` calls `recordEMIPaymentAccounting` for offline loan EMI payments
  - `/lib/simple-accounting.ts` handles:
    - Personal Credit → Company 3 Cashbook (always CASH only)
    - Company Credit ONLINE → Loan Company's Bank Account
    - Company Credit CASH → Loan Company's Cashbook
    - Mirror Loan → Full mirror amounts in mirror company's books

Stage Summary:
- **Bank Account Enhancements**:
  - Bank accounts now support UPI ID and QR Code for customer payment page display
  - Customers can see payment details (UPI ID, QR Code) when paying EMI
  - IFSC Code and Branch Name added for complete bank details
- **Payment Flow Verified**:
  - Customer Portal Payment → Entry in loan company's bank/cashbook
  - Staff Portal Payment → Entry based on credit type selection
  - Extra EMI → Entry only in Company 3 Cashbook (profit for Company 3)
  - Mirror Loan EMI → Entry in both original and mirror company's books
- Commit: c8ae6c3
- Pushed to Git and deployed to Vercel

---
Task ID: 22
Task: Implement New Balance Sheet Format (Left Side / Right Side)

Work Log:
- Completely rewrote `/api/accountant/balance-sheet/route.ts` with new logic:
  - LEFT SIDE: CashBook Balance + Bank Balance (Funds Available)
  - RIGHT SIDE: Outstanding Loans (Principal + Interest) + Profit/Loss (Difference)
  - Profit/Loss = Left Total - Loans Total (to balance both sides)
- Added year-wise filter support (FY 2024-25, FY 2023-24, etc.)
- Added company-wise separation (Company 1 vs Company 2 balance sheets)
- Updated BalanceSheetData interface with new structure
- Updated BalanceSheetSection component with:
  - Year selector dropdown
  - Two-column layout (Left/Right sides)
  - Balance verification indicator
  - Summary stats cards
- Added `selectedYear` state to SimplifiedAccountantDashboard

Stage Summary:
- **LEFT SIDE (Assets/Funds Available)**:
  - Cash in Hand (CashBook Balance)
  - Bank Balance (all bank accounts)
  - Total = Cash + Bank
- **RIGHT SIDE (Loans/Deployments)**:
  - Online Loans Outstanding (Principal)
  - Offline Loans Outstanding (Principal)
  - Interest Receivable (Online + Offline)
  - Profit/Loss (Difference to balance)
  - Total = Must equal LEFT SIDE
- **Balance Sheet Rule**: LEFT TOTAL = RIGHT TOTAL (Always Balanced)
- **Year-wise**: Can select different financial years
- **Company-wise**: Separate balance sheet for Company 1 and Company 2
- Build passes, lint passes
- Ready for Git push and Vercel deployment

---
Task ID: 23
Task: Fix build errors - Remove non-existent field and fix variable declaration order

Work Log:
- Removed `interestType` from LoanApplication select query (field doesn't exist on that model)
- Moved `formData` state declaration before useMemo hooks that depend on it
- Removed duplicate `formData` declaration that was left over
- Build now passes successfully

Stage Summary:
- Fixed TypeScript error: `interestType` not in LoanApplication model
- Fixed hoisting error: `formData` used before declaration
- Commit: c5ddb46
- Pushed to Git and deployed to Vercel

---
Task ID: 24
Task: Fix Mirror Loan Disbursement - Deduct from Mirror Company Only

Work Log:
- Identified issue: When mirror loan is disbursed, disbursement was happening TWICE:
  1. Original loan disbursement from Company 3 CashBook
  2. Mirror loan creation (but no bank deduction)
- Fixed in `/api/workflow/approve/route.ts`:
  - Added check for pending mirror loan with APPROVED status
  - If exists, SKIP the disbursement accounting for original loan
  - Added log message explaining the skip
- Fixed in `/api/pending-mirror-loan/route.ts`:
  - Added bank transaction creation when mirror loan is disbursed
  - Deducts from mirror company's bank account
  - Creates proper bank transaction record with reference to mirror loan
  - Logs warning if bank account ID not provided

Stage Summary:
- **Mirror Loan Disbursement Now Works Correctly**:
  - Original loan (Company 3) → NO deduction from CashBook
  - Mirror loan → DEDUCT from Mirror Company's Bank Account
- **Single Disbursement Rule**: Money only goes out ONCE from the mirror company
- **Example Flow**:
  1. Company 3 creates loan for ₹50,000
  2. Mirror to Company 1 (15% reducing)
  3. Disbursement: ₹50,000 deducted from Company 1's bank account
  4. Company 3 CashBook: NO deduction
- Build passes, lint passes
- Ready for Git push

---
Task ID: 25
Task: Fix Mirror Loan Issues - Cascade Delete, UI Labels, Correct Cashbook Display

Work Log:
- **Cascade Delete for Mirror Loans**:
  - Updated `/api/offline-loan/route.ts` DELETE handler
  - When deleting ORIGINAL loan → automatically delete MIRROR loan and mapping
  - When deleting MIRROR loan → only delete mapping (preserve original)
  - Deletes all EMIs, CashBook entries, Bank transactions for mirror loan
  - Added success message indicating mirror loan was deleted
- **Mirror Loan Color/Badge in List**:
  - Verified `OfflineLoansList.tsx` already has color indicator and badge
  - Shows "Original Loan" or "Mirror Loan" badge based on mapping
  - Color indicator applied via displayColor field
- **Fixed EMI Payment Dialog Cashbook Display**:
  - Added `getCashbookCompanyName()` helper function to determine correct company
  - For mirrored loans: Returns mirror company for normal EMIs, original company for extra EMIs
  - Updated hardcoded "Company 3" text to use dynamic company name
  - Fixed Personal Credit, Company Credit options to show correct company name
  - Fixed Payment Mode section to show correct entry destination

Stage Summary:
- **Cascade Delete**: Deleting original loan now deletes mirror loan + mapping automatically
- **UI Labels**: Loans in list show "Original Loan" or "Mirror Loan" badge with color indicator
- **Correct Cashbook Display**:
  - For Mirror EMIs (within tenure) → Shows mirror company name
  - For Extra EMIs (beyond mirror tenure) → Shows original company name
  - Dynamic company name based on EMI number and mirror status
- Build passes, lint passes
