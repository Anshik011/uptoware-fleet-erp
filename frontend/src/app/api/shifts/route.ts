import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { getShiftAllocations, createShiftAllocation } from '@/lib/frappe';
import { ShiftTypeOption, ShiftAllocationStatus } from '@/types/fleet';

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
    const includeTest = searchParams.get('include_test') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const allocations = await getShiftAllocations(`sid=${auth.sid}`, {
      vehicle,
      driver,
      status,
      includeTest,
      limit,
    });

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

    let derivedEnd = allocationEnd || null;
    if (!derivedEnd && allocationStart && shiftType) {
      const startDateStr = allocationStart.split(' ')[0];
      if (shiftType.includes('06:00 - 14:00')) {
        derivedEnd = `${startDateStr} 14:00:00`;
      } else if (shiftType.includes('14:00 - 22:00')) {
        derivedEnd = `${startDateStr} 22:00:00`;
      } else if (shiftType.includes('22:00 - 06:00')) {
        const nextDay = new Date(startDateStr);
        nextDay.setDate(nextDay.getDate() + 1);
        derivedEnd = `${nextDay.toISOString().split('T')[0]} 06:00:00`;
      } else if (shiftType.includes('09:00 - 18:00')) {
        derivedEnd = `${startDateStr} 18:00:00`;
      }
    }

    const created = await createShiftAllocation(
      `sid=${auth.sid}`,
      {
        vehicle,
        driver,
        shiftType,
        allocationStart,
        allocationEnd: derivedEnd,
        status: status || 'Active',
        isPrimary: typeof isPrimary === 'boolean' ? isPrimary : true,
        remarks: remarks || null,
        isTestRecord: Boolean(isTestRecord),
      },
      auth.user.email || auth.user.name
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

