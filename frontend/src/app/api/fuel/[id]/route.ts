import { NextRequest, NextResponse } from 'next/server';
import { getFuelLogDetails } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'fuel', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid fuel log identifier.' },
        { status: 400 }
      );
    }

    const { log, recentVehicleLogs } = await getFuelLogDetails(auth.sid, id);
    return NextResponse.json({ success: true, data: { log, recentVehicleLogs } });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /fuel/[id] GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch fuel log details.' },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Session authentication required.' },
      { status: 401 }
    );
  }

  // Deletion is strictly prohibited for operational roles
  return NextResponse.json(
    {
      success: false,
      error: 'Forbidden: Operational deletion of Fuel Log records is strictly prohibited.',
    },
    { status: 403 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, DELETE' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, DELETE' } }
  );
}

