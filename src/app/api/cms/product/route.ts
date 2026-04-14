import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys } from '@/lib/cache';

// Permanent loan products configuration
const PERMANENT_PRODUCTS = [
  {
    title: 'Personal Loan',
    description: 'Unsecured personal loans for your various needs - education, wedding, travel, or any personal expenses. Quick approval with minimal documentation.',
    icon: '👤',
    code: 'PL',
    loanType: 'PERSONAL',
    minInterestRate: 10,
    maxInterestRate: 24,
    defaultInterestRate: 15,
    minTenure: 6,
    maxTenure: 60,
    defaultTenure: 24,
    minAmount: 10000,
    maxAmount: 5000000,
    processingFeePercent: 1,
    processingFeeMin: 500,
    processingFeeMax: 5000,
    latePaymentPenaltyPercent: 2,
    gracePeriodDays: 5,
    bounceCharges: 500,
    allowMoratorium: false,
    maxMoratoriumMonths: 0,
    allowPrepayment: true,
    prepaymentCharges: 2,
    isPermanent: true,
    isActive: true,
    order: 0,
  },
  {
    title: 'Gold Loan',
    description: 'Get instant loans against your gold jewelry with attractive interest rates. Quick disbursement with minimal documentation.',
    icon: '🏆',
    code: 'GL',
    loanType: 'GOLD',
    minInterestRate: 7,
    maxInterestRate: 15,
    defaultInterestRate: 10,
    minTenure: 3,
    maxTenure: 36,
    defaultTenure: 12,
    minAmount: 10000,
    maxAmount: 50000000,
    processingFeePercent: 0.5,
    processingFeeMin: 500,
    processingFeeMax: 5000,
    latePaymentPenaltyPercent: 2,
    gracePeriodDays: 7,
    bounceCharges: 500,
    allowMoratorium: false,
    maxMoratoriumMonths: 0,
    allowPrepayment: true,
    prepaymentCharges: 1,
    isPermanent: true,
    isActive: true,
    order: 1,
  },
  {
    title: 'Vehicle Loan',
    description: 'Finance your dream vehicle with competitive interest rates. Loans for cars, bikes, and commercial vehicles.',
    icon: '🚗',
    code: 'VL',
    loanType: 'VEHICLE',
    minInterestRate: 8,
    maxInterestRate: 18,
    defaultInterestRate: 12,
    minTenure: 12,
    maxTenure: 84,
    defaultTenure: 36,
    minAmount: 50000,
    maxAmount: 10000000,
    processingFeePercent: 1,
    processingFeeMin: 1000,
    processingFeeMax: 10000,
    latePaymentPenaltyPercent: 3,
    gracePeriodDays: 5,
    bounceCharges: 500,
    allowMoratorium: true,
    maxMoratoriumMonths: 3,
    allowPrepayment: true,
    prepaymentCharges: 2,
    isPermanent: true,
    isActive: true,
    order: 2,
  },
  {
    title: 'Business Loan',
    description: 'Grow your business with flexible business loans. Working capital, equipment purchase, or business expansion.',
    icon: '💼',
    code: 'BL',
    loanType: 'BUSINESS',
    minInterestRate: 12,
    maxInterestRate: 24,
    defaultInterestRate: 18,
    minTenure: 12,
    maxTenure: 84,
    defaultTenure: 36,
    minAmount: 100000,
    maxAmount: 10000000,
    processingFeePercent: 1.5,
    processingFeeMin: 1000,
    processingFeeMax: 15000,
    latePaymentPenaltyPercent: 3,
    gracePeriodDays: 5,
    bounceCharges: 750,
    allowMoratorium: true,
    maxMoratoriumMonths: 3,
    allowPrepayment: true,
    prepaymentCharges: 2,
    isPermanent: true,
    isActive: true,
    order: 3,
  },
  {
    title: 'Home Loan',
    description: 'Make your dream home a reality with competitive home loan rates. Purchase, construction, or renovation.',
    icon: '🏠',
    code: 'HL',
    loanType: 'HOME',
    minInterestRate: 8,
    maxInterestRate: 14,
    defaultInterestRate: 10,
    minTenure: 60,
    maxTenure: 360,
    defaultTenure: 180,
    minAmount: 500000,
    maxAmount: 50000000,
    processingFeePercent: 0.5,
    processingFeeMin: 5000,
    processingFeeMax: 20000,
    latePaymentPenaltyPercent: 2,
    gracePeriodDays: 7,
    bounceCharges: 1000,
    allowMoratorium: true,
    maxMoratoriumMonths: 18,
    allowPrepayment: true,
    prepaymentCharges: 0,
    isPermanent: true,
    isActive: true,
    order: 4,
  },
  {
    title: 'Education Loan',
    description: 'Invest in your future with education loans for higher studies. Competitive rates for students and parents.',
    icon: '🎓',
    code: 'EL',
    loanType: 'EDUCATION',
    minInterestRate: 8,
    maxInterestRate: 14,
    defaultInterestRate: 10,
    minTenure: 36,
    maxTenure: 120,
    defaultTenure: 60,
    minAmount: 100000,
    maxAmount: 5000000,
    processingFeePercent: 0.5,
    processingFeeMin: 500,
    processingFeeMax: 5000,
    latePaymentPenaltyPercent: 1,
    gracePeriodDays: 30,
    bounceCharges: 250,
    allowMoratorium: true,
    maxMoratoriumMonths: 48,
    allowPrepayment: true,
    prepaymentCharges: 0,
    isPermanent: true,
    isActive: true,
    order: 5,
  },
  {
    title: 'Interest Only Loan',
    description: 'Pay only interest during the initial period, then start principal repayment. Ideal for borrowers expecting future income growth.',
    icon: '💰',
    code: 'INTEREST_ONLY',
    loanType: 'INTEREST_ONLY',
    isInterestOnly: true, // This is an Interest Only loan product
    minInterestRate: 10,
    maxInterestRate: 24,
    defaultInterestRate: 15,
    minTenure: 6,
    maxTenure: 60,
    defaultTenure: 24,
    minAmount: 50000,
    maxAmount: 5000000,
    processingFeePercent: 1,
    processingFeeMin: 500,
    processingFeeMax: 5000,
    latePaymentPenaltyPercent: 2,
    gracePeriodDays: 5,
    bounceCharges: 500,
    allowMoratorium: false,
    maxMoratoriumMonths: 0,
    allowPrepayment: true,
    prepaymentCharges: 0,
    isPermanent: true,
    isActive: true,
    order: 6,
  }
];

// Flag to track if permanent products have been checked
let permanentProductsChecked = false;

// Ensure permanent products exist in database (run once per server instance)
async function ensurePermanentProducts() {
  // Skip if already checked
  if (permanentProductsChecked) {
    return;
  }
  
  try {
    // Use Promise.all for parallel queries instead of sequential
    const existingProducts = await db.cMSService.findMany({
      where: { isPermanent: true },
      select: { loanType: true, id: true }
    });
    
    const existingTypes = new Set(existingProducts.map(p => p.loanType));
    const missingProducts = PERMANENT_PRODUCTS.filter(p => !existingTypes.has(p.loanType));
    
    // Create missing products in parallel
    if (missingProducts.length > 0) {
      await Promise.all(
        missingProducts.map(product => 
          db.cMSService.create({ data: product })
            .then(() => console.log(`Created permanent product: ${product.title}`))
            .catch(err => console.error(`Failed to create ${product.title}:`, err))
        )
      );
    }
    
    permanentProductsChecked = true;
  } catch (error) {
    console.error('Error ensuring permanent products:', error);
  }
}

// GET - List all products or get single product (CACHED)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const isActive = searchParams.get('isActive');

    // Run ensurePermanentProducts SYNCHRONOUSLY so products always exist before returning
    await ensurePermanentProducts();

    if (id) {
      const product = await db.cMSService.findUnique({
        where: { id }
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ product });
    }

    // Cache active products for 5 minutes (this data rarely changes)
    if (isActive === 'true') {
      const products = await cache.getOrSet(
        CacheKeys.CMS_SERVICES,
        () => db.cMSService.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            code: true,
            loanType: true,
            isInterestOnly: true,
            minInterestRate: true,
            maxInterestRate: true,
            defaultInterestRate: true,
            minTenure: true,
            maxTenure: true,
            defaultTenure: true,
            minAmount: true,
            maxAmount: true,
            processingFeePercent: true,
            isActive: true,
            isPermanent: true,
            order: true
          }
        }),
        300000
      );
      // Fallback: if DB returned empty (e.g. fresh DB, seeding race), return in-memory constants
      if (!products || products.length === 0) {
        return NextResponse.json({ products: PERMANENT_PRODUCTS.map((p, i) => ({ ...p, id: `temp_${i}` })) });
      }
      return NextResponse.json({ products });
    }

    const products = await db.cMSService.findMany({
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title, description, icon, code, loanType,
      minInterestRate, maxInterestRate, defaultInterestRate,
      minTenure, maxTenure, defaultTenure,
      minAmount, maxAmount,
      processingFeePercent, processingFeeMin, processingFeeMax,
      latePaymentPenaltyPercent, gracePeriodDays, bounceCharges,
      allowMoratorium, maxMoratoriumMonths,
      allowPrepayment, prepaymentCharges,
      isActive, order
    } = body;

    if (!title || !description || !code) {
      return NextResponse.json({ error: 'Title, description, and code are required' }, { status: 400 });
    }

    const maxOrder = await db.cMSService.aggregate({
      _max: { order: true }
    });

    const product = await db.cMSService.create({
      data: {
        title,
        description,
        icon: icon || '📝',
        code: code.toUpperCase(),
        loanType: loanType || 'PERSONAL',
        minInterestRate: parseFloat(minInterestRate) || 8,
        maxInterestRate: parseFloat(maxInterestRate) || 24,
        defaultInterestRate: parseFloat(defaultInterestRate) || 12,
        minTenure: parseInt(minTenure) || 6,
        maxTenure: parseInt(maxTenure) || 60,
        defaultTenure: parseInt(defaultTenure) || 12,
        minAmount: parseFloat(minAmount) || 10000,
        maxAmount: parseFloat(maxAmount) || 10000000,
        processingFeePercent: parseFloat(processingFeePercent) || 1,
        processingFeeMin: parseFloat(processingFeeMin) || 500,
        processingFeeMax: parseFloat(processingFeeMax) || 10000,
        latePaymentPenaltyPercent: parseFloat(latePaymentPenaltyPercent) || 2,
        gracePeriodDays: parseInt(gracePeriodDays) || 5,
        bounceCharges: parseFloat(bounceCharges) || 500,
        allowMoratorium: allowMoratorium !== false,
        maxMoratoriumMonths: parseInt(maxMoratoriumMonths) || 3,
        allowPrepayment: allowPrepayment !== false,
        prepaymentCharges: parseFloat(prepaymentCharges) || 2,
        isActive: isActive !== false,
        order: parseInt(order) || (maxOrder._max.order || 0) + 1
      }
    });

    // Clear cache
    cache.delete(CacheKeys.CMS_SERVICES);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    const numericFields = [
      'minInterestRate', 'maxInterestRate', 'defaultInterestRate',
      'minTenure', 'maxTenure', 'defaultTenure',
      'minAmount', 'maxAmount',
      'processingFeePercent', 'processingFeeMin', 'processingFeeMax',
      'latePaymentPenaltyPercent', 'gracePeriodDays', 'bounceCharges',
      'maxMoratoriumMonths', 'prepaymentCharges', 'order'
    ];

    const intFields = ['minTenure', 'maxTenure', 'defaultTenure', 'gracePeriodDays', 'maxMoratoriumMonths', 'order'];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (numericFields.includes(key)) {
          updateData[key] = intFields.includes(key) ? parseInt(value as string) : parseFloat(value as string);
        } else if (key === 'allowMoratorium' || key === 'allowPrepayment' || key === 'isActive') {
          updateData[key] = value === true || value === 'true';
        } else {
          updateData[key] = value;
        }
      }
    }

    const product = await db.cMSService.update({
      where: { id },
      data: updateData
    });

    // Clear cache
    cache.delete(CacheKeys.CMS_SERVICES);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product is permanent
    const product = await db.cMSService.findUnique({
      where: { id },
      select: { isPermanent: true, title: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.isPermanent) {
      return NextResponse.json({ 
        error: 'This loan product is permanent and cannot be deleted',
        isPermanent: true 
      }, { status: 403 });
    }

    await db.cMSService.delete({
      where: { id }
    });

    // Clear cache
    cache.delete(CacheKeys.CMS_SERVICES);

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
