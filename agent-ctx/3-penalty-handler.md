# Task 3: EMIPaymentDialog Penalty Handling

## Summary

Updated the EMIPaymentDialog component to handle penalty for overdue EMIs.

## Changes Made

### 1. Updated EMIItem Interface (`EMIPaymentDialog.tsx`)
- Added `penaltyAmount?: number` field
- Added `daysOverdue?: number` field  
- Added `loanAmount?: number` to `loanApplication` interface (for penalty calculation)

### 2. Added Penalty State
- Added `penaltyWaiver` state (default: '0')

### 3. Added Penalty Calculation Functions
- `getPenaltyPerDay(loanAmount)`: Returns penalty rate based on loan amount tier
  - ≤1L: ₹100/day
  - 1-3L: ₹200/day
  - >3L: ₹100 × ceil(lakhs)/day
- `getLoanAmountForPenalty()`: Gets loan amount from offlineLoan or loanApplication
- `calculatePenaltyDetails()`: Returns penaltyAmount, daysOverdue, ratePerDay, netPenalty

### 4. Added Penalty Section UI
- Red/warning styled section shown when EMI is overdue
- Displays:
  - Days overdue badge
  - Penalty rate per day (with tier indicator)
  - Total penalty amount
  - Optional waiver input field
  - Net penalty after waiver

### 5. Updated Payment Submission
- **Offline loans**: Added penaltyAmount, penaltyWaiver, penaltyPaymentMode to request body
- **Online loans**: Added penalty fields to FormData
- Total amount includes penalty: `details.amount + penaltyDetails.netPenalty`

### 6. Updated Payment Summary Section
- Shows EMI Amount breakdown
- Shows Penalty (with days count)
- Shows Waiver (if any)
- Shows Total to Collect (EMI + Penalty - Waiver)

### 7. Updated Action Buttons
- Button text shows total including penalty
- Disabled when waiver exceeds penalty amount

### 8. Updated Toast Messages
- Shows total collected including penalty
- Mentions penalty amount if applicable

### 9. Added Form Reset
- Penalty waiver resets to '0' on form reset

## Files Modified
- `/home/z/my-project/src/components/emi/EMIPaymentDialog.tsx`

## Dependencies
- Uses existing `/api/emi/apply-penalty` for penalty calculation reference
- Uses existing `/api/emi/pay` which already handles penalty fields

## Testing Notes
- Penalty section only shows when EMI has penaltyAmount > 0 and is overdue
- Waiver input is validated to not exceed total penalty
- All existing payment flows (FULL, PARTIAL, INTEREST_ONLY, PRINCIPAL_ONLY) work with penalty
