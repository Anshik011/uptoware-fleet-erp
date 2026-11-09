import { NextRequest, NextResponse } from 'next/server';
import { getCustomers } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    if (!checkPermission(auth.user, 'mineSites', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const customers = await getCustomers(auth.sid, includeTest);
    return NextResponse.json(
      { success: true, count: customers.length, data: customers },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /mine-sites/customers GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch customer options.' },
      { status }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

