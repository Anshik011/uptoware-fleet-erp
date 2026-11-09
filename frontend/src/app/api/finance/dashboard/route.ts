import { NextRequest, NextResponse } from 'next/server';
import { getFinancialDashboard } from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'finance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view financial dashboard.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const filters = {
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
      vehicle: searchParams.get('vehicle') || undefined,
      customer: searchParams.get('customer') || undefined,
    };

    const data = await getFinancialDashboard(auth.sid, filters, includeTest);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: includeTest,
        user: {
          id: auth.user.id,
          name: auth.user.name,
          role: auth.user.role,
        },
        data,
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
    console.error('API /api/finance/dashboard error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch financial dashboard data' },
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

