import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import {
  resolveUserMineScope,
  validateAndResolveMineFilter,
  MineAuthorizationError,
} from '@/lib/mineAuth';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate request using user's Frappe session
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

    // 2. Enforce server-side RBAC authorization
    if (!checkPermission(auth.user, 'dashboard', 'view')) {
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

    // 3. Query Frappe using authenticated user's session
    const searchParams = request.nextUrl.searchParams;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, searchParams.get('mine_site') || undefined);
    const targetMine = mineFilter.filterType === 'single' ? mineFilter.targetMine : undefined;

    const data = await getDashboardData(auth.sid, includeTest, targetMine);

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
          Expires: '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.warn('API /dashboard error handled gracefully with baseline metrics:', error?.message || 'Error');
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: false,
        data: {
          kpi: {
            totalVehicles: 0,
            activeVehicles: 0,
            inMaintenance: 0,
            inBreakdown: 0,
            outOfService: 0,
            utilizationRate: 0,
            totalCapacityTons: 0,
            activeCapacityTons: 0,
            completedTrips: 0,
            inProgressTrips: 0,
            totalRevenue: 0,
            totalOperatingCost: 0,
            fuelCost: 0,
            maintenanceCost: 0,
            netOperatingIncome: 0,
          },
          recentTrips: [],
          recentAlerts: [],
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
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
