import { NextRequest, NextResponse } from 'next/server';
import { getVehicleCompliance } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'compliance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions for compliance records.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;
    const showTestRecords =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const { vehicles, metrics } = await getVehicleCompliance(auth.sid, {
      search,
      status,
      showTestRecords,
    });

    let filtered = vehicles;
    if (status && status !== 'ALL') {
      filtered = filtered.filter((v) => v.overallCompliance === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vehicle.toLowerCase().includes(q) ||
          v.licensePlate.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      vehicles: filtered,
      metrics,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching vehicle compliance records:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching compliance records' },
      { status: error.status || 500 }
    );
  }
}

