import { NextRequest, NextResponse } from 'next/server';
import { getFleetSettings, updateFleetSettings } from '@/lib/frappe';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    const role = auth.user.role;
    const isSuperAdmin =
      role === 'Administrator' ||
      auth.user.roles.includes('System Manager') ||
      auth.user.roles.includes('Administrator');

    const isFleetManager = role === 'Fleet Manager' || auth.user.roles.includes('Fleet Manager');

    // Administrator has full access; Fleet Manager has view-only; Dispatcher/Workshop/Accountant strictly blocked (403)
    if (!isSuperAdmin && !isFleetManager) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Insufficient privileges. Only Administrator and Fleet Manager can view settings.',
        },
        { status: 403 }
      );
    }

    const settings = await getFleetSettings(auth.sid);

    return NextResponse.json({
      success: true,
      settings,
      isReadOnly: !isSuperAdmin,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /admin/settings GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve fleet operational settings.' },
      { status: err?.status || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    const isSuperAdmin =
      auth.user.role === 'Administrator' ||
      auth.user.roles.includes('System Manager') ||
      auth.user.roles.includes('Administrator');

    // Strict: Only Administrator can modify operational settings. Fleet Manager is view-only.
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Administrator privileges required to update operational thresholds.',
        },
        { status: 403 }
      );
    }

    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload.' },
        { status: 400 }
      );
    }

    const updated = await updateFleetSettings(auth.sid, body);

    return NextResponse.json({
      success: true,
      message: 'Fleet operational settings updated successfully.',
      settings: updated,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /admin/settings PUT error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update fleet settings.' },
      { status: err?.status || 500 }
    );
  }
}

