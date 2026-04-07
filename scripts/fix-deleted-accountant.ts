import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check deleted users
  const deletedUsers = await prisma.deletedUser.findMany({
    where: { originalRole: 'ACCOUNTANT' }
  })
  
  console.log('Deleted accountants:', deletedUsers)
  
  // Remove from deleted users table
  const result = await prisma.deletedUser.deleteMany({
    where: { originalRole: 'ACCOUNTANT' }
  })
  
  console.log('Removed from deleted users:', result.count)
}

main().catch(console.error).finally(() => prisma.$disconnect())
