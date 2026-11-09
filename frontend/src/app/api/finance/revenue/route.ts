import { NextRequest, NextResponse } from 'next/server';
import { getSalesInvoices } from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'revenue', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view revenue register.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const filters = {
      customer: searchParams.get('customer') || undefined,
      status: searchParams.get('status') || undefined,
      vehicle: searchParams.get('vehicle') || undefined,
      trip: searchParams.get('trip') || undefined,
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
    };

    const invoices = await getSalesInvoices(auth.sid, filters, includeTest);

    // Summary statistics
    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let totalReturns = 0;
    let paidInvoicesCount = 0;
    const customerAggregation: Record<string, { customer: string; count: number; invoiced: number; outstanding: number }> = {};

    for (const inv of invoices) {
      if (inv.isReturn) {
        totalReturns += Math.abs(inv.baseGrandTotal);
      } else {
        totalInvoiced += inv.baseGrandTotal;
      }
      totalOutstanding += inv.outstandingAmount;
      if (inv.status === 'Paid') {
        paidInvoicesCount++;
      }

      const c = inv.customerName || inv.customer;
      if (!customerAggregation[c]) {
        customerAggregation[c] = { customer: c, count: 0, invoiced: 0, outstanding: 0 };
      }
      customerAggregation[c].count++;
      customerAggregation[c].invoiced += inv.isReturn ? -Math.abs(inv.baseGrandTotal) : inv.baseGrandTotal;
      customerAggregation[c].outstanding += inv.outstandingAmount;
    }

    const netRevenue = totalInvoiced - totalReturns;

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: includeTest,
        totalCount: invoices.length,
        summary: {
          totalInvoiced,
          totalReturns,
          netRevenue,
          totalOutstanding,
          paidInvoicesCount,
          totalInvoicesCount: invoices.length,
        },
        customers: Object.values(customerAggregation),
        invoices,
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
    console.error('API /api/finance/revenue error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch sales invoices' },
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

