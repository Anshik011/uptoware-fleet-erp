import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import { validateAndResolveMineFilter, assertMineAccess, MineAuthorizationError } from '@/lib/mineAuth';
import { getShiftAllocations, createShiftAllocation } from '@/lib/frappe';
import { ShiftTypeOption, ShiftAllocationStatus } from '@/types/fleet';
import { toLocalDateString } from '@/lib/datetime';

const PERMITTED_SHIFTS: ShiftTypeOption[] = [
  'Morning (06:00 - 14:00)',
  'Afternoon (14:00 - 22:00)',
  'Evening (14:00 - 22:00)',
  'Night (22:00 - 06:00)',
  'General (09:00 - 18:00)',
  'General / Full Day',
];

const PERMITTED_STATUSES: ShiftAllocationStatus[] = [
  'Scheduled',
  'Active',
  'Completed',
  'Cancelled',
];

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'shifts', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view shift allocations.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicle = searchParams.get('vehicle') || undefined;
    const driver = searchParams.get('driver') || undefined;
    const status = searchParams.get('status') || undefined;
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');

    // Resolve mine authorization boundary
    let mineFilter;
    try {
      mineFilter = validateAndResolveMineFilter(auth.user, requestedMine);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    if (searchParams.get('include_test') === 'true' && !isAuthorizedForTestRecords(auth.user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access to test records requires Administrator or System Manager privileges.' },
        { status: 403 }
      );
    }
    const includeTest = isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    let allocations = await getShiftAllocations(`sid=${auth.sid}`, {
      vehicle,
      driver,
      status,
      includeTest,
      limit,
    });

    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      allocations = allocations.filter((a) => a.mineSite === mineFilter.targetMine);
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      allocations = allocations.filter((a) => a.mineSite && mineFilter.targetMines!.includes(a.mineSite));
    }

    return NextResponse.json({
      success: true,
      data: allocations,
      count: allocations.length,
    });
  } catch (error: any) {
    console.error('Shifts GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error fetching shift allocations.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'shifts', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to manage shift allocations.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      vehicle,
      driver,
      shiftType,
      allocationStart,
      allocationEnd,
      status,
      isPrimary,
      remarks,
      isTestRecord,
    } = body;

    if (!vehicle || typeof vehicle !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Vehicle ID is required.' },
        { status: 400 }
      );
    }

    if (!driver || typeof driver !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Driver ID is required.' },
        { status: 400 }
      );
    }

    if (!shiftType || !PERMITTED_SHIFTS.includes(shiftType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation Error: Invalid shift type '${shiftType}'. Permitted: ${PERMITTED_SHIFTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!allocationStart) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Allocation start date/time is required.' },
        { status: 400 }
      );
    }

    if (status && !PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation Error: Invalid status '${status}'. Permitted: ${PERMITTED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Operational Mine Site validation & authorization
    const mineSite = (body.mineSite || body.customMineSite || (auth.user.allowedMines.length === 1 ? auth.user.allowedMines[0] : '')).trim();
    if (!mineSite) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Mine Site is required for shift allocations.' },
        { status: 400 }
      );
    }

    try {
      assertMineAccess(auth.user, mineSite);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    let derivedEnd = allocationEnd || null;
    if (!derivedEnd && allocationStart && shiftType) {
      const startDateStr = allocationStart.split(' ')[0];
      if (shiftType.includes('06:00 - 14:00')) {
        derivedEnd = `${startDateStr} 14:00:00`;
      } else if (shiftType.includes('14:00 - 22:00')) {
        derivedEnd = `${startDateStr} 22:00:00`;
      } else if (shiftType.includes('22:00 - 06:00')) {
        const nextDay = new Date(`${startDateStr}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        derivedEnd = `${toLocalDateString(nextDay)} 06:00:00`;
      } else if (shiftType.includes('09:00 - 18:00') || shiftType.includes('General')) {
        derivedEnd = `${startDateStr} 18:00:00`;
      }
    }

    const created = await createShiftAllocation(
      `sid=${auth.sid}`,
      {
        vehicle,
        driver,
        mineSite,
        shiftType,
        allocationStart,
        allocationEnd: derivedEnd,
        status: status || 'Active',
        isPrimary: typeof isPrimary === 'boolean' ? isPrimary : true,
        remarks: remarks || null,
        isTestRecord: Boolean(isTestRecord),
      },
      auth.user.id || auth.user.name || 'Administrator'
    );

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: 'Shift allocation created successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Shifts POST error:', error);
    // Extract frappe server script validation message if present
    let errorMsg = error.message || 'Internal server error creating shift allocation.';
    if (errorMsg.includes('ValidationError:')) {
      errorMsg = errorMsg.split('ValidationError:')[1].split('\n')[0].trim();
    }
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}

