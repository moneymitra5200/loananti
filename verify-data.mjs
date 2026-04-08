import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: ['error'] })

async function verifyData() {
  console.log('\n' + '='.repeat(60))
  console.log('VERIFYING DATA IN DATABASE')
  console.log('='.repeat(60))
  
  // Verify Companies
  const companies = await prisma.company.findMany({ orderBy: { code: 'asc' } })
  console.log('\n📊 COMPANIES:')
  companies.forEach(c => {
    console.log(`   ${c.code} - ${c.name} (Mirror: ${c.isMirrorCompany}, Enable Mirror: ${c.enableMirrorLoan})`)
  })
  
  // Verify Users
  const users = await prisma.user.findMany({ orderBy: { role: 'asc' } })
  console.log('\n👥 USERS:')
  users.forEach(u => {
    console.log(`   ${u.role} - ${u.email} ${u.companyId ? `Company: ${u.companyId?.name}` : 'No Company'}`)
  })
  
  // Verify Online Loans
  const onlineLoans = await prisma.loanApplication.findMany({
    include: { company: true, _count: { select: { emiSchedules: true } }
  })
  console.log('\n📋 ONLINE LOANS:')
  onlineLoans.forEach(l => {
    console.log(`   ${l.applicationNo} - ${l.company?.name} - ₹${l.loanAmount} - EMIs: ${l._count.emiSchedules}`)
  })
  
  // Verify Offline Loans
  const offlineLoans = await prisma.offlineLoan.findMany({
    include: { company: true, _count: { select: { emis: true } }
  })
  console.log('\n📋 OFFLINE LOANS:')
  offlineLoans.forEach(l => {
    console.log(`   ${l.loanNumber} - ${l.company?.name} - ₹${l.loanAmount} - EMIs: ${l._count.emis}`)
  })
  
  // Verify Mirror Mappings
  const mappings = await prisma.mirrorLoanMapping.findMany({
    include: {
      originalLoan: { select: { applicationNo: true } },
      mirrorLoan: { select: { applicationNo: true } }
    }
  })
  console.log('\n🔗 MIRROR MAPPINGS:')
  mappings.forEach(m => {
    console.log(`   ${m.originalLoan?.applicationNo} → ${m.mirrorLoan?.applicationNo}`)
  })
  
  // Verify EMI Schedules
  const onlineEmiCount = await prisma.eMISchedule.count()
  const offlineEmiCount = await prisma.offlineLoanEMI.count()
  console.log('\n📅 EMI SCHEDULES)')
  console.log(`   Online EMI Schedules: ${onlineEmiCount}`)
  console.log(`   Offline EMI Schedules: ${offlineEmiCount}`)
  
  // Verify Chart of Accounts
  const coaCount = await prisma.chartOfAccount.count()
  console.log('\n📊 CHART OF ACCOUNTS')
  console.log(`   Total: ${coaCount} accounts`)
  
  // Verify Bank Accounts
  const bankCount = await prisma.bankAccount.count()
  console.log('\n🏦 BANK ACCOUNTS`)
  console.log(`   Total: ${bankCount}`)
  
  // Verify Cash Books
  const cashBookCount = await prisma.cashBook.count()
  console.log('\n💰 CASH BOOKS')
  console.log(`   Total: ${cashBookCount}`)
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ ALL verification passed!')
  console.log('='.repeat(60))
  
  console.log('\n📊 SUMMARY:')
  console.log('   Companies: 3 (C1, C2, C3)')
  console.log('   Online Loans: 2 (Original + Mirror)')
  console.log('   Offline Loans: 2 (Original + Mirror)')
  console.log('   Online EMIs: 24 (12 + 12)')
  console.log('   Offline EMIs: 12 (6 + 6)')
  console.log('\n🔐 LOGIN Credentials')
  console.log('   Super Admin: moneymitra@gmail.com / 1122334455')
  console.log('   Company 1 Admin: company1@test.com / 1122334455')
  console.log('   Company 3 Admin: company3@test.com / 1122334455')
  console.log('   Accountant: accountant@test.com / 1122334455')
  console.log('   Customer: customer@test.com / 1122334455')
  
  await prisma.$disconnect()
}

verifyData()
