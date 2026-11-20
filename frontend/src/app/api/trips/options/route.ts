import { NextRequest, NextResponse } from 'next/server';
import { getTripFormOptions } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { validateAndResolveMineFilter, MineAuthorizationError } from '@/lib/mineAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    if (!checkPermission(auth.user, 'trips', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
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

    const targetMine = mineFilter.filterType === 'single' ? mineFilter.targetMine : undefined;
    const options = await getTripFormOptions(auth.sid, targetMine);

    // Apply mine authorization scoping
    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      options.mineSites = options.mineSites.filter((s) => s.id === mineFilter.targetMine || s.siteName === mineFilter.targetMine);
      options.vehicles = options.vehicles.filter((v) => v.customMineSite === mineFilter.targetMine);
      options.drivers = options.drivers.filter((d) => d.customMineSite === mineFilter.targetMine);
      options.leads = (options.leads || []).filter((l) => l.mineSite === mineFilter.targetMine);
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      options.mineSites = options.mineSites.filter((s) => mineFilter.targetMines!.includes(s.id) || mineFilter.targetMines!.includes(s.siteName));
      options.vehicles = options.vehicles.filter((v) => v.customMineSite && mineFilter.targetMines!.includes(v.customMineSite));
      options.drivers = options.drivers.filter((d) => d.customMineSite && mineFilter.targetMines!.includes(d.customMineSite));
      options.leads = (options.leads || []).filter((l) => mineFilter.targetMines!.includes(l.mineSite));
    }

    return NextResponse.json(
      { success: true, data: options },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /trips/options GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch trip creation options.' },
      { status }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

