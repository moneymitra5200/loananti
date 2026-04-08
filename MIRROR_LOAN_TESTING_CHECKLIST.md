# Mirror Loan System - Testing Checklist

## Issues Fixed

### 1. Mirror Interest Recording (CRITICAL FIX)
**Problem**: When EMI was paid on a mirror loan, the ORIGINAL loan's interest was being recorded instead of the MIRROR interest calculated at mirror rate.

**Fix**: Updated `/api/offline-loan/route.ts` and `/api/emi/pay/route.ts` to fetch the mirror EMI and use the correct mirror interest for accounting entries.

### 2. ONLINE vs CASH Payment Routing (CRITICAL FIX)
**Problem**: ALL payments were going to Cash Book, but ONLINE payments should go to Bank Account.

**Fix**: Updated `/lib/simple-accounting.ts` to route:
- ONLINE/BANK_TRANSFER/UPI payments → Bank Account
- CASH payments → Cash Book

### 3. Bank Account Code Added
**Fix**: Added `BANK_ACCOUNT` (code 1102) to the Chart of Accounts for proper journal entries.

---

## Testing Flow

### Step 1: Reset System
- [ ] Reset the entire system to start fresh

### Step 2: Create Companies
- [ ] Create Company 1 (Mirror Company - e.g., "Money Mitra Finance Advisor")
- [ ] Create Company 2 (Mirror Company)
- [ ] Create Company 3 (Original Company - e.g., "PD Rangani")

### Step 3: Create Offline Loan (Company 3)
- [ ] Go to Offline Loan Creation
- [ ] Select Company 3 (PD Rangani)
- [ ] Loan Amount: ₹10,000
- [ ] Interest Rate: 24% FLAT
- [ ] Tenure: 10 months
- [ ] Enable Mirror Loan
- [ ] Select Mirror Company: Company 1 (Money Mitra Finance Advisor)
- [ ] Set Mirror Interest Rate: 15% REDUCING
- [ ] Create the loan

### Step 4: Verify Loan Creation
- [ ] Check that ORIGINAL loan is created in Company 3
- [ ] Check that MIRROR loan is created in Company 1
- [ ] Verify mirror loan has fewer EMIs (due to 15% reducing rate)
- [ ] Note the Mirror Tenure (should be less than 10)
- [ ] Note the Extra EMI Count (should be 10 - Mirror Tenure)

### Step 5: Verify EMI Schedules
- [ ] Check ORIGINAL loan EMI schedule (10 EMIs)
- [ ] Check MIRROR loan EMI schedule (fewer EMIs)
- [ ] Compare interest amounts - MIRROR interest should be LOWER than ORIGINAL interest

### Step 6: Test EMI Payment (Within Mirror Tenure)
**Example: Pay EMI #1**

- [ ] Go to Cashier Dashboard
- [ ] Select the loan
- [ ] Pay EMI #1 with:
  - Payment Mode: ONLINE
  - Credit Type: COMPANY

**Verify Accounting:**
- [ ] Check Mirror Company's Bank Account increased by MIRROR INTEREST amount
- [ ] Check Journal Entry in Mirror Company with correct MIRROR interest
- [ ] Check Cash Book - should NOT have entry for this ONLINE payment

### Step 7: Test EMI Payment with CASH
- [ ] Pay EMI #2 with:
  - Payment Mode: CASH
  - Credit Type: COMPANY

**Verify Accounting:**
- [ ] Check Mirror Company's Cash Book increased by MIRROR INTEREST amount
- [ ] Check Journal Entry in Mirror Company
- [ ] Check Bank Account - should NOT have entry for this CASH payment

### Step 8: Test Extra EMI Payment (Beyond Mirror Tenure)
- [ ] Pay all EMIs within Mirror Tenure first
- [ ] Pay Extra EMI (EMI # > Mirror Tenure)

**Verify Accounting:**
- [ ] Check ORIGINAL Company's (Company 3) Cash Book increased by FULL EMI amount
- [ ] This is PURE PROFIT for Company 3

### Step 9: Verify Final Summary
- [ ] Total Mirror Interest collected in Mirror Company = Sum of MIRROR interest from all EMIs within mirror tenure
- [ ] Extra EMI profit in Original Company = Sum of all EXTRA EMI amounts
- [ ] All ONLINE payments → Bank Account in respective company
- [ ] All CASH payments → Cash Book in respective company

---

## Expected Results Summary

### For 10K Loan with 24% FLAT (10 EMIs) mirrored to 15% REDUCING:

| Payment Type | Company | Book | Amount |
|-------------|---------|------|--------|
| EMI #1-7 (Mirror Tenure) - ONLINE | Mirror Company | Bank Account | Mirror Interest only |
| EMI #1-7 (Mirror Tenure) - CASH | Mirror Company | Cash Book | Mirror Interest only |
| EMI #8-10 (Extra EMIs) | Original Company | Cash Book | FULL EMI Amount |

### Key Points:
1. **Mirror Interest** is calculated at **15% reducing rate** (lower than original)
2. **Extra EMIs** are **pure profit** for Original Company (Company 3)
3. **ONLINE payments** go to **Bank Account**
4. **CASH payments** go to **Cash Book**
5. **Personal Credit** always goes to **Company 3 Cash Book**

---

## Debug Console Logs to Check

When paying EMI, check console for:
```
[Accounting] MIRROR LOAN EMI Payment - Recording ONLY mirror interest: ₹XXX
[Accounting] Payment Mode: ONLINE → BANK ACCOUNT
[Accounting] MIRROR: Recorded ₹XXX in Mirror Company BANK ACCOUNT
[Accounting] MIRROR EMI Interest: ₹XXX (Mirror Rate) vs Original: ₹YYY
```

This confirms the correct interest is being recorded.
