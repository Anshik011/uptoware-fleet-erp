import { NextRequest, NextResponse } from 'next/server';
import { getInventoryOptions } from '@/lib/frappe';
import { getAuthenticatedUser } from '@/lib/auth';
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

    const options = await getInventoryOptions(auth.sid);

    // Apply mine authorization scoping
    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      const target = mineFilter.targetMine;
      // Hybrid warehouse model: central warehouses (customMineSite === null) remain visible,
      // while mine-specific warehouses are scoped by mine authorization.
      options.warehouses = options.warehouses.filter(
        (w) => !w.customMineSite || w.customMineSite === target
      );
      options.vehicles = options.vehicles.filter(
        (v) => !v.customMineSite || v.customMineSite === target
      );
      options.breakdowns = options.breakdowns.filter(
        (b) => !b.mineSite || b.mineSite === target
      );
      if (options.mineSites) {
        options.mineSites = options.mineSites.filter(
          (s) => s.id === target || s.siteName === target
        );
      }
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      const targets = mineFilter.targetMines;
      options.warehouses = options.warehouses.filter(
        (w) => !w.customMineSite || targets.includes(w.customMineSite)
      );
      options.vehicles = options.vehicles.filter(
        (v) => !v.customMineSite || targets.includes(v.customMineSite)
      );
      options.breakdowns = options.breakdowns.filter(
        (b) => !b.mineSite || targets.includes(b.mineSite)
      );
      if (options.mineSites) {
        options.mineSites = options.mineSites.filter(
          (s) => targets.includes(s.id) || targets.includes(s.siteName)
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...options,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory options:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching inventory options' },
      { status: error.status || 500 }
    );
  }
}

