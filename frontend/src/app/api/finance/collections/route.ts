import { NextRequest, NextResponse } from 'next/server';
import { getPaymentEntries } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'collections', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view collections register.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const filters = {
      customer: searchParams.get('customer') || undefined,
      modeOfPayment: searchParams.get('mode_of_payment') || undefined,
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
    };

    const payments = await getPaymentEntries(auth.sid, filters, includeTest);

    // Summary statistics
    let totalReceived = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;
    const modeBreakdown: Record<string, { mode: string; count: number; amount: number }> = {};
    const customerBreakdown: Record<string, { customer: string; count: number; amount: number }> = {};

    for (const p of payments) {
      totalReceived += p.receivedAmount;
      totalAllocated += p.allocatedAmount;
      totalUnallocated += p.unallocatedAmount;

      const m = p.modeOfPayment || 'Other';
      if (!modeBreakdown[m]) {
        modeBreakdown[m] = { mode: m, count: 0, amount: 0 };
      }
      modeBreakdown[m].count++;
      modeBreakdown[m].amount += p.receivedAmount;

      const c = p.partyName || p.party;
      if (!customerBreakdown[c]) {
        customerBreakdown[c] = { customer: c, count: 0, amount: 0 };
      }
      customerBreakdown[c].count++;
      customerBreakdown[c].amount += p.receivedAmount;
    }

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: includeTest,
        totalCount: payments.length,
        summary: {
          totalReceived,
          totalAllocated,
          totalUnallocated,
          totalCollectionsCount: payments.length,
        },
        paymentModes: Object.values(modeBreakdown),
        customers: Object.values(customerBreakdown),
        payments,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /api/finance/collections error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch collections' },
      { status: error?.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

