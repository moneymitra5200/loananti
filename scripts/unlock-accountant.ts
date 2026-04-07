import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all accountants
  const accountants = await prisma.user.findMany({
    where: { role: 'ACCOUNTANT' }
  })
  
  console.log('Found accountants:', accountants.map(a => ({ id: a.id, email: a.email, name: a.name, isLocked: a.isLocked })))
  
  // Unlock all accountants
  const result = await prisma.user.updateMany({
    where: { role: 'ACCOUNTANT' },
    data: { isLocked: false, failedLoginAttempts: 0 }
  })
  
  console.log('Unlocked accountants:', result.count)
}

main().catch(console.error).finally(() => prisma.$disconnect())
