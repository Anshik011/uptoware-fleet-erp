import { NextRequest, NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/frappe';
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

    if (!isSuperAdmin && !isFleetManager) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Insufficient privileges. Only Administrator and Fleet Manager can view health diagnostics.',
        },
        { status: 403 }
      );
    }

    const health = await getSystemHealth(auth.sid);

    return NextResponse.json({
      success: true,
      health,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /admin/health GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve system health.' },
      { status: err?.status || 500 }
    );
  }
}

