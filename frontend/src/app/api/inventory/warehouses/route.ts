import { NextRequest, NextResponse } from 'next/server';
import { getWarehouses } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'warehouses', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const warehouses = await getWarehouses(auth.sid);

    return NextResponse.json({
      success: true,
      warehouses,
      totalCount: warehouses.length,
    });
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching warehouses' },
      { status: error.status || 500 }
    );
  }
}

