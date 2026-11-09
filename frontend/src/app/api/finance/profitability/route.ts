import { NextRequest, NextResponse } from 'next/server';
import {
  getVehicleProfitability,
  getTripProfitability,
  getCustomerRevenue,
  getFinancialDashboard,
} from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'profitability', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view profitability analytics.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const filters = {
      vehicle: searchParams.get('vehicle') || undefined,
      customer: searchParams.get('customer') || undefined,
      mineSite: searchParams.get('mine_site') || undefined,
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
    };

    const [summary, vehicles, trips, customers] = await Promise.all([
      getFinancialDashboard(auth.sid, filters, includeTest),
      getVehicleProfitability(auth.sid, filters, includeTest),
      getTripProfitability(auth.sid, filters, includeTest),
      getCustomerRevenue(auth.sid, filters, includeTest),
    ]);

    const formulaDefinitions = {
      invoicedRevenue: 'Σ base_grand_total of submitted Sales Invoices (docstatus = 1) minus credit notes (is_return = 1)',
      totalOperatingCost: 'Fuel Cost (Approved) + Maintenance Cost (Parts + Labour) + Approved Operational Expenses (Pre-GL)',
      netOperatingIncome: 'Invoiced Revenue - Total Consolidated Operating Cost (Operational P&L)',
      operatingMarginPct: '(Net Operating Income / Invoiced Revenue) * 100 (if Revenue > 0 else 0.0%)',
      tripContribution: 'Invoiced Revenue (or Estimated Revenue) - (Direct Trip OpEx + Direct Repair Cost)',
      vehicleNetMargin: 'Vehicle Invoiced Revenue - (Vehicle Fuel + Vehicle Maintenance + Direct OpEx + Insurance)',
      indicativeRevenueWarning: 'Mine Site rate_per_ton is an operational planning estimate only. Actual recognized revenue is derived strictly from submitted Sales Invoices (docstatus = 1).',
      operationalVsAccountingNote: 'Approved operational expenses represent field disbursements prior to General Ledger posting. They are non-duplicated against GL Journal Entries.',
    };

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: includeTest,
        summary,
        formulaDefinitions,
        vehicleProfitability: vehicles,
        tripProfitability: trips,
        customerRevenue: customers,
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
    console.error('API /api/finance/profitability error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch profitability analytics' },
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

