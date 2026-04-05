# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║           OFFLINE LOAN ACCOUNTING - VERIFICATION GUIDE                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

## 📌 STEP 1: CREATE OFFLINE LOAN (₹10,000 @ 24% FLAT, 10 MONTHS → C1)

### When you create the loan:
1. Original Loan created in C3 (₹10,000 @ 24% FLAT, 10 EMIs = ₹1,200/EMI)
2. Mirror Loan created in C1 (₹10,000 @ 15% REDUCING, 9 EMIs = ₹1,200/EMI)
3. Extra EMI for C3 profit: 1 EMI = ₹1,200

### What happens in C1 Accounting:
```
JOURNAL ENTRY - DISBURSEMENT
═══════════════════════════════════════════════════════
  Dr. Loans Receivable (1200)    ₹10,000
  Cr. Bank (1000)                ₹10,000
═══════════════════════════════════════════════════════
```

### Chart of Accounts AFTER DISBURSEMENT:
```
┌──────────┬──────────────────────────┬────────────────┬─────────────┐
│  Code    │ Account Name             │ Type           │ Balance     │
├──────────┼──────────────────────────┼────────────────┼─────────────┤
│ 1000     │ Bank                     │ ASSET          │ ₹    90,000 │
│ 1200     │ Loans Receivable         │ ASSET          │ ₹    10,000 │
│ 5000     │ Owner's Capital          │ EQUITY         │ ₹   100,000 │
└──────────┴──────────────────────────┴────────────────┴─────────────┘
```

### Trial Balance AFTER DISBURSEMENT:
```
┌──────────────────────────────┬─────────────┬─────────────┐
│ Account                      │    Debit    │   Credit    │
├──────────────────────────────┼─────────────┼─────────────┤
│ Bank                         │    ₹90,000 │           │
│ Loans Receivable             │    ₹10,000 │           │
│ Owner's Capital              │           │   ₹100,000 │
├──────────────────────────────┼─────────────┼─────────────┤
│ TOTAL                        │   ₹100,000 │   ₹100,000 │  ✅ BALANCED
└──────────────────────────────┴─────────────┴─────────────┘
```

---

## 📌 STEP 2: EMI PAYMENT (₹1,200)

### What happens when customer pays EMI:
1. Bank receives ₹1,200
2. Loans Receivable decreases by principal (₹1,075)
3. Mirror Interest Income increases by interest (₹125)

### Journal Entry:
```
JOURNAL ENTRY - EMI PAYMENT
═══════════════════════════════════════════════════════
  Dr. Bank (1000)                 ₹1,200
  Cr. Loans Receivable (1200)     ₹1,075
  Cr. Mirror Interest Income (3300)  ₹125
═══════════════════════════════════════════════════════
```

### Chart of Accounts AFTER EMI:
```
┌──────────┬──────────────────────────┬────────────────┬─────────────┐
│  Code    │ Account Name             │ Type           │ Balance     │
├──────────┼──────────────────────────┼────────────────┼─────────────┤
│ 1000     │ Bank                     │ ASSET          │ ₹    91,200 │
│ 1200     │ Loans Receivable         │ ASSET          │ ₹     8,925 │
│ 3300     │ Mirror Interest Income   │ INCOME         │ ₹       125 │
│ 5000     │ Owner's Capital          │ EQUITY         │ ₹   100,000 │
└──────────┴──────────────────────────┴────────────────┴─────────────┘
```

### Trial Balance AFTER EMI:
```
┌──────────────────────────────┬─────────────┬─────────────┐
│ Account                      │    Debit    │   Credit    │
├──────────────────────────────┼─────────────┼─────────────┤
│ Bank                         │    ₹91,200 │           │
│ Loans Receivable             │     ₹8,925 │           │
│ Mirror Interest Income       │           │       ₹125 │
│ Owner's Capital              │           │   ₹100,000 │
├──────────────────────────────┼─────────────┼─────────────┤
│ TOTAL                        │   ₹100,125 │   ₹100,125 │  ✅ BALANCED
└──────────────────────────────┴─────────────┴─────────────┘
```

### Balance Sheet AFTER EMI:
```
ASSETS                          LIABILITIES & EQUITY
────────────────────────────    ────────────────────────────
Bank:               ₹91,200     Liabilities:        ₹0
Loans Receivable:   ₹8,925      Owner's Capital:    ₹100,000
                                Income:             ₹125
────────────────────────────    ────────────────────────────
Total Assets:       ₹100,125    Total L&E:          ₹100,125
                                ────────────────────────────
                                ✅ BALANCED
```

---

## 📌 HOW TO VERIFY IN THE APP

### 1. Chart of Accounts Page
- Go to Accounting → Chart of Accounts
- Select Company 1 (C1)
- Verify all accounts with balances

### 2. Trial Balance Page
- Go to Accounting → Trial Balance
- Select Company 1 (C1)
- Verify: Total Debit = Total Credit

### 3. Balance Sheet Page
- Go to Accounting → Balance Sheet
- Select Company 1 (C1)
- Verify: Assets = Liabilities + Equity + Income

### 4. Journal Entries Page
- Go to Accounting → Journal Entries
- Select Company 1 (C1)
- Verify all journal entries created

### 5. Bank Account
- Go to Accounting → Bank Accounts
- Select Company 1 (C1)
- Verify bank balance matches Chart of Accounts

---

## 📌 PERMANENT SEED DATA

The seed file (`prisma/seed.ts`) creates:

### Companies:
| Company | Code | Type | isMirrorCompany | Accounting |
|---------|------|------|-----------------|------------|
| Company 3 | C3 | Original | false | Cashbook only |
| Company 1 | C1 | Mirror | true | Full CoA |
| Company 2 | C2 | Mirror | true | Full CoA |

### Chart of Accounts (C1 & C2):
| Code | Account | Type |
|------|---------|------|
| 1000 | Bank | ASSET |
| 1100 | Cash in Hand | ASSET |
| 1200 | Loans Receivable | ASSET |
| 1300 | Interest Receivable | ASSET |
| 2000 | Accounts Payable | LIABILITY |
| 2100 | Borrowed Money | LIABILITY |
| 3000 | Interest Income | INCOME |
| 3100 | Processing Fee Income | INCOME |
| 3300 | Mirror Interest Income | INCOME |
| 4000 | Interest Expense | EXPENSE |
| 5000 | Owner's Capital | EQUITY |
| 5100 | Retained Earnings | EQUITY |

### Initial Balances:
- Company 1: Bank ₹1,00,000 | Equity ₹1,00,000
- Company 2: Bank ₹1,00,000 | Equity ₹1,00,000

---

## 📌 TO RESET DATABASE:

```bash
cd /home/z/my-project
DATABASE_URL="mysql://..." bun run db:push --force-reset
DATABASE_URL="mysql://..." bun run prisma/seed.ts
```

---

## 📌 LOGIN CREDENTIALS:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | moneymitra@gmail.com | 1122334455 |
| Company 3 | company3@test.com | company3 |
| Company 1 | company1@test.com | company1 |
| Company 2 | company2@test.com | company2 |

