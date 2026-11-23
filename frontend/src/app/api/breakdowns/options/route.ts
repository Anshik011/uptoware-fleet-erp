import { NextRequest, NextResponse } from 'next/server';
import { getBreakdownOptions } from '@/lib/frappe';
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

    const options = await getBreakdownOptions(auth.sid);

    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      const target = mineFilter.targetMine;
      options.mineSites = options.mineSites.filter((s) => s.id === target || s.siteName === target);
      const filteredVehicles = options.vehicles.filter((v: any) => (v.customMineSite || v.mineSite) === target);
      options.vehicles = filteredVehicles.length > 0 ? filteredVehicles : options.vehicles;
      const filteredDrivers = options.drivers.filter((d: any) => (d.customMineSite || d.mineSite) === target);
      options.drivers = filteredDrivers.length > 0 ? filteredDrivers : options.drivers;
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      const targets = mineFilter.targetMines;
      options.mineSites = options.mineSites.filter((s) => targets.includes(s.id) || targets.includes(s.siteName));
      const filteredVehicles = options.vehicles.filter((v: any) => (v.customMineSite || v.mineSite) && targets.includes(v.customMineSite || v.mineSite));
      options.vehicles = filteredVehicles.length > 0 ? filteredVehicles : options.vehicles;
      const filteredDrivers = options.drivers.filter((d: any) => (d.customMineSite || d.mineSite) && targets.includes(d.customMineSite || d.mineSite));
      options.drivers = filteredDrivers.length > 0 ? filteredDrivers : options.drivers;
    }

    return NextResponse.json(
      {
        success: true,
        ...options,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /breakdowns/options GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch breakdown options.' },
      { status: 500 }
    );
  }
}
