import { NextRequest, NextResponse } from 'next/server';
import { getAdminUsers } from '@/lib/frappe';
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

    // Strict Admin-Only Access: Dispatcher, Workshop, Accountant, and Fleet Manager denied
    const isSuperAdmin =
      auth.user.role === 'Administrator' ||
      auth.user.roles.includes('System Manager') ||
      auth.user.roles.includes('Administrator');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Administrator privileges required to access user rosters.' },
        { status: 403 }
      );
    }

    const users = await getAdminUsers(auth.sid);

    return NextResponse.json({
      success: true,
      users,
      totalCount: users.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /admin/users GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve user rosters.' },
      { status: err?.status || 500 }
    );
  }
}

