import { NextRequest, NextResponse } from 'next/server';
import { getWarehouses } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { validateAndResolveMineFilter, MineAuthorizationError } from '@/lib/mineAuth';

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

    const { searchParams } = new URL(request.url);
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');

    let mineFilter;
    try {
      mineFilter = validateAndResolveMineFilter(auth.user, requestedMine);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    let warehouses = await getWarehouses(auth.sid);

    // Hybrid warehouse model: central/shared warehouses (customMineSite === null) remain visible,
    // while mine-specific warehouses are scoped by mine authorization.
    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      warehouses = warehouses.filter(
        (w) => !w.customMineSite || w.customMineSite === mineFilter.targetMine
      );
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      warehouses = warehouses.filter(
        (w) => !w.customMineSite || mineFilter.targetMines!.includes(w.customMineSite)
      );
    }

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

