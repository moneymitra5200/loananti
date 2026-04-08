process.env.DATABASE_URL = "mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteOrphanedUsers() {
  console.log('Finding orphaned users (companyId pointing to non-existent company)...');
  
  try {
    // Get all users with companyId set
    const usersWithCompany = await prisma.user.findMany({
      where: { 
        companyId: { not: null }
      },
      select: { id: true, email: true, role: true, companyId: true }
    });
    
    console.log(`Found ${usersWithCompany.length} users with companyId set`);
    
    // Get all existing companies
    const companies = await prisma.company.findMany({
      select: { id: true }
    });
    const existingCompanyIds = new Set(companies.map(c => c.id));
    
    console.log(`Found ${existingCompanyIds.size} existing companies`);
    
    // Find orphaned users
    const orphanedUsers = usersWithCompany.filter(u => !existingCompanyIds.has(u.companyId!));
    
    console.log(`Found ${orphanedUsers.length} orphaned users to delete:`, orphanedUsers);
    
    if (orphanedUsers.length === 0) {
      console.log('No orphaned users found');
      return;
    }
    
    const orphanedIds = orphanedUsers.map(u => u.id);
    
    // Delete related records for orphaned users
    console.log('Deleting related records...');
    
    await prisma.auditLog.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.workflowLog.deleteMany({ where: { actionById: { in: orphanedIds } } });
    await prisma.locationLog.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.reminder.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.notificationSetting.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.deviceFingerprint.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.blacklist.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.userSession.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.userPreference.deleteMany({ where: { userId: { in: orphanedIds } } });
    await prisma.agentPerformance.deleteMany({ where: { agentId: { in: orphanedIds } } });
    await prisma.preApprovedOffer.deleteMany({ where: { customerId: { in: orphanedIds } } });
    
    // Create deleted user records
    for (const user of orphanedUsers) {
      try {
        await prisma.deletedUser.create({
          data: {
            email: user.email,
            firebaseUid: `orphaned-${user.id}`,
            originalRole: user.role
          }
        });
      } catch {}
    }
    
    // Delete the orphaned users
    await prisma.user.deleteMany({ where: { id: { in: orphanedIds } } });
    
    console.log(`Successfully deleted ${orphanedUsers.length} orphaned users`);
    
    // Verify
    const remaining = await prisma.user.count();
    console.log(`Remaining users: ${remaining}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOrphanedUsers();
