import { NextRequest, NextResponse } from 'next/server';
import { getFuelOptions } from '@/lib/frappe';
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

    const options = await getFuelOptions(auth.sid);

    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      options.mineSites = options.mineSites.filter((s) => s.id === mineFilter.targetMine || s.siteName === mineFilter.targetMine);
      options.vehicles = options.vehicles.filter((v) => v.customMineSite === mineFilter.targetMine);
      options.drivers = options.drivers.filter((d) => d.customMineSite === mineFilter.targetMine);
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      options.mineSites = options.mineSites.filter((s) => mineFilter.targetMines!.includes(s.id) || mineFilter.targetMines!.includes(s.siteName));
      options.vehicles = options.vehicles.filter((v) => v.customMineSite && mineFilter.targetMines!.includes(v.customMineSite));
      options.drivers = options.drivers.filter((d) => d.customMineSite && mineFilter.targetMines!.includes(d.customMineSite));
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
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /fuel/options error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch fuel form options.' },
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

