import { db } from '@/lib/db';

/**
 * Generates a sequential receipt number for a specific company or prefix.
 * Example output: RCP-MM-1, RCP-MM-2, etc.
 * Or RCP-MIRROR-1, RCP-MIRROR-PO-1
 */
export async function generateSequentialReceiptNumber(prefix: string): Promise<string> {
  // If prefix doesn't end with '-', append it
  const fullPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
  
  try {
    // Find all receipt numbers that match the prefix
    const payments = await db.payment.findMany({
      where: {
        receiptNumber: {
          startsWith: fullPrefix
        }
      },
      select: { receiptNumber: true }
    });
    
    let maxSeq = 0;
    
    for (const p of payments) {
      if (p.receiptNumber) {
        // Find the number part at the end
        const numberPart = p.receiptNumber.substring(fullPrefix.length);
        const num = parseInt(numberPart, 10);
        
        // Ensure it's a valid integer and not a timestamp (timestamps are large > 10000000)
        // Also ensure it exactly matches the integer (no extra characters)
        if (!isNaN(num) && num.toString() === numberPart && num < 10000000) {
          if (num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
    
    // Also check Expense Requests for receipt numbers (if they share the same sequence)
    // Actually, Expense Requests don't usually generate receipts like this, but let's just stick to Payments
    // Wait! OfflineLoanEMI also might have receipt numbers in the future if stored directly.
    // For now, checking Payment is enough since all generated receipts create a Payment.
    
    return `${fullPrefix}${maxSeq + 1}`;
  } catch (error) {
    console.error('[Sequence Generator] Error generating sequence:', error);
    // Fallback to random if DB fails
    return `${fullPrefix}${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}
