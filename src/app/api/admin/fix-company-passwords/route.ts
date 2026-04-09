import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const password = await bcrypt.hash('Test@123', 10);

    const companies = await db.user.findMany({
      where: { role: 'COMPANY' }
    });

    console.log('[fix-company-passwords] Found companies:', companies.map(c => c.email));

    const updated: string[] = [];
    for (const company of companies) {
      await db.user.update({
        where: { id: company.id },
        data: { password: password }
      });
      if (company.email) {
        updated.push(company.email);
      }
      console.log('[fix-company-passwords] Updated password for:', company.email);
    }

    return NextResponse.json({
      success: true,
      message: `Updated passwords for ${updated.length} company users. Password is: Test@123`,
      updated,
      password: 'Test@123'
    });
  } catch (error) {
    console.error('Error fixing company passwords:', error);
    return NextResponse.json({
      error: 'Failed to fix passwords',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
