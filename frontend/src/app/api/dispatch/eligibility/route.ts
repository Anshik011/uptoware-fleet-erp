import { NextRequest, NextResponse } from 'next/server';
import { checkDispatchEligibility } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

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

    if (!checkPermission(auth.user, 'dispatch', 'view')) {
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
    const vehicle = searchParams.get('vehicle');
    const driver = searchParams.get('driver');
    const odometerStr = searchParams.get('opening_odometer');
    const openingOdometer = odometerStr ? Number(odometerStr) : undefined;

    if (!vehicle || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle parameter is mandatory for eligibility check.' },
        { status: 400 }
      );
    }

    if (!driver || !driver.trim()) {
      return NextResponse.json(
        { success: false, error: 'Driver parameter is mandatory for eligibility check.' },
        { status: 400 }
      );
    }

    const eligibility = await checkDispatchEligibility(
      auth.sid,
      vehicle.trim(),
      driver.trim(),
      openingOdometer
    );

    return NextResponse.json(
      { success: true, data: eligibility },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /dispatch/eligibility GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check dispatch eligibility.' },
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

