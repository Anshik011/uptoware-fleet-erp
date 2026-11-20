import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeAttendanceSummary } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import {
  resolveUserMineScope,
  validateAndResolveMineFilter,
  MineAuthorizationError,
} from '@/lib/mineAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'employees', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view attendance summary.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, requestedMine || undefined);
    const targetMine = mineFilter.filterType === 'single' ? mineFilter.targetMine : undefined;

    let summary = await getEmployeeAttendanceSummary(auth.sid, {
      mineSite: targetMine,
      month,
      year,
    });

    if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      summary = summary.filter((s) => mineFilter.targetMines!.includes(s.mineSite));
    }

    return NextResponse.json(
      {
        success: true,
        data: summary,
        count: summary.length,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('API /attendance/summary GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch attendance summary.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
