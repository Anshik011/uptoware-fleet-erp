import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeAttendance, markEmployeeAttendance } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import {
  resolveUserMineScope,
  validateAndResolveMineFilter,
  validateWriteMineSite,
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
        { success: false, error: 'Forbidden: Insufficient permissions to view attendance.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');
    const employee = searchParams.get('employee') || undefined;
    const date = searchParams.get('date') || undefined;
    const startDate = searchParams.get('startDate') || searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('endDate') || searchParams.get('end_date') || undefined;
    const attendanceStatus = searchParams.get('status') || searchParams.get('attendance_status') || undefined;

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, requestedMine || undefined);
    const targetMine = mineFilter.filterType === 'single' ? mineFilter.targetMine : undefined;

    let records = await getEmployeeAttendance(auth.sid, {
      employee,
      mineSite: targetMine,
      date,
      startDate,
      endDate,
      attendanceStatus,
      limit: 500,
    });

    if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      records = records.filter((r) => mineFilter.targetMines!.includes(r.mineSite));
    }

    return NextResponse.json(
      {
        success: true,
        data: records,
        count: records.length,
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
    console.error('API /attendance GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch attendance records.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'employees', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to mark attendance.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.employee || !body.attendanceDate || !body.attendanceStatus) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory fields: employee, attendanceDate, attendanceStatus.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const validStatuses = ['Present', 'Half Day', 'Absent', 'On Leave'];
    if (!validStatuses.includes(body.attendanceStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid attendanceStatus. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (body.mineSite) {
      const mineScope = await resolveUserMineScope(request);
      validateWriteMineSite(mineScope, body.mineSite);
    }

    const saved = await markEmployeeAttendance(auth.sid, {
      employee: body.employee,
      attendanceDate: body.attendanceDate,
      attendanceStatus: body.attendanceStatus,
      shift: body.shift || 'Day',
      vehicle: body.vehicle,
      mineSite: body.mineSite,
      dailySalaryRate: body.dailySalaryRate ? Number(body.dailySalaryRate) : undefined,
      remarks: body.remarks,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Employee attendance recorded successfully.',
        data: saved,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('API /attendance POST error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to record attendance.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
