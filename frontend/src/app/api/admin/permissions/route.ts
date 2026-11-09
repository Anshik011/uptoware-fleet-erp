import { NextRequest, NextResponse } from 'next/server';
import { getAdminPermissions } from '@/lib/frappe';
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
        { success: false, error: 'Forbidden: Administrator privileges required to inspect role permission matrices.' },
        { status: 403 }
      );
    }

    const permissions = await getAdminPermissions(auth.sid);

    return NextResponse.json({
      success: true,
      permissions,
      totalCount: permissions.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /admin/permissions GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve permission matrix.' },
      { status: err?.status || 500 }
    );
  }
}

