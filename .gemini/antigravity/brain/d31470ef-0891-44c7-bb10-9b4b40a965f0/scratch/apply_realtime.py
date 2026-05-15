import sys
import re

file_path = r'c:\Users\bscom\Desktop\reallll\src\components\accountant\AccountantDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if "useRealtime" not in content:
    content = content.replace(
        "import RoleAuditPanel from '@/components/shared/RoleAuditPanel';",
        "import RoleAuditPanel from '@/components/shared/RoleAuditPanel';\nimport { useRealtime } from '@/hooks/useRealtime';"
    )

# 2. Add refreshKey to state
if "const [refreshKey, setRefreshKey]" not in content:
    content = content.replace(
        "const [activeSection, setActiveSection] = useState('day-book');",
        "const [activeSection, setActiveSection] = useState('day-book');\n  const [refreshKey, setRefreshKey] = useState(0);"
    )

# 3. Add useRealtime hook
if "useRealtime({" not in content:
    hook_code = """
  const triggerRefresh = useCallback(() => {
    console.log('[AccountantDashboard] Real-time refresh triggered');
    setRefreshKey(prev => prev + 1);
  }, []);

  useRealtime({
    userId: user?.id,
    role: user?.role,
    companyId: selectedCompanyId,
    onDashboardRefresh: triggerRefresh,
  });
"""
    # Insert after companies effect
    content = content.replace(
        "const selectedCompany = companies.find(c => c.id === selectedCompanyId);",
        "const selectedCompany = companies.find(c => c.id === selectedCompanyId);" + hook_code
    )

# 4. Update Section Props and Dependencies
sections = [
    ('CashBookSection', 'loadData', '[selectedCompanyId]'),
    ('BankSection', 'loadData', '[selectedCompanyId]'),
    ('TrialBalanceSection', 'loadTrialBalance', '[selectedCompanyId, asOfDate]'),
    ('ProfitLossSection', 'loadProfitLoss', '[selectedCompanyId, startDate, endDate]'),
    ('BalanceSheetSection', 'loadBalanceSheet', '[selectedCompanyId]')
]

for section, load_fn, deps in sections:
    # Add refreshKey to props
    content = content.replace(
        f"function {section}({{\n  selectedCompanyId,\n  formatCurrency,",
        f"function {section}({{\n  selectedCompanyId,\n  formatCurrency,\n  refreshKey = 0,"
    )
    # Add refreshKey to dependency list
    new_deps = deps.replace(']', ', refreshKey]')
    content = content.replace(
        f"}}, {deps});",
        f"}}, {new_deps});"
    )
    # Add refreshKey to call
    content = content.replace(
        f"<{section}\n            selectedCompanyId={{selectedCompanyId}}\n            formatCurrency={{formatCurrency}}",
        f"<{section}\n            selectedCompanyId={{selectedCompanyId}}\n            formatCurrency={{formatCurrency}}\n            refreshKey={{refreshKey}}"
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Real-time sync successfully applied to AccountantDashboard.tsx")
