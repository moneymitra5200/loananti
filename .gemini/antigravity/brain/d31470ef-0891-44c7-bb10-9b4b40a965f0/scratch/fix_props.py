import re

file_path = r'c:\Users\bscom\Desktop\reallll\src\components\accountant\AccountantDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix CashBookSection
content = re.sub(
    r'function CashBookSection\(\{\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDateShort\n\}\: \{\n  selectedCompanyId\: string;\n  formatCurrency\: \(amount\: number\) \=\> string;\n  formatDateShort\: \(date\: Date \| string\) \=\> string;\n\}\)',
    'function CashBookSection({\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDateShort\n}: {\n  selectedCompanyId: string;\n  formatCurrency: (amount: number) => string;\n  formatDateShort: (date: Date | string) => string;\n  refreshKey?: number;\n})',
    content
)

# Fix BankSection
content = re.sub(
    r'function BankSection\(\{\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDateShort\n\}\: \{\n  selectedCompanyId\: string;\n  formatCurrency\: \(amount\: number\) \=\> string;\n  formatDateShort\: \(date\: Date \| string\) \=\> string;\n\}\)',
    'function BankSection({\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDateShort\n}: {\n  selectedCompanyId: string;\n  formatCurrency: (amount: number) => string;\n  formatDateShort: (date: Date | string) => string;\n  refreshKey?: number;\n})',
    content
)

# Fix TrialBalanceSection
content = re.sub(
    r'function TrialBalanceSection\(\{\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDate\n\}\: \{\n  selectedCompanyId\: string;\n  formatCurrency\: \(amount\: number\) \=\> string;\n  formatDate\: \(date\: Date \| string\) \=\> string;\n\}\)',
    'function TrialBalanceSection({\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDate\n}: {\n  selectedCompanyId: string;\n  formatCurrency: (amount: number) => string;\n  formatDate: (date: Date | string) => string;\n  refreshKey?: number;\n})',
    content
)

# Fix ProfitLossSection
content = re.sub(
    r'function ProfitLossSection\(\{\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDate\n\}\: \{\n  selectedCompanyId\: string;\n  formatCurrency\: \(amount\: number\) \=\> string;\n  formatDate\: \(date\: Date \| string\) \=\> string;\n\}\)',
    'function ProfitLossSection({\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDate\n}: {\n  selectedCompanyId: string;\n  formatCurrency: (amount: number) => string;\n  formatDate: (date: Date | string) => string;\n  refreshKey?: number;\n})',
    content
)

# Fix BalanceSheetSection
content = re.sub(
    r'function BalanceSheetSection\(\{\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDate\n\}\: \{\n  selectedCompanyId\: string;\n  formatCurrency\: \(amount\: number\) \=\> string;\n  formatDate\: \(date\: Date \| string\) \=\> string;\n\}\)',
    'function BalanceSheetSection({\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,\n  formatDate\n}: {\n  selectedCompanyId: string;\n  formatCurrency: (amount: number) => string;\n  formatDate: (date: Date | string) => string;\n  refreshKey?: number;\n})',
    content
)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Props type error fixed")
