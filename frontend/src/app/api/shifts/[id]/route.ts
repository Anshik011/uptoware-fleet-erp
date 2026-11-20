import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { assertMineAccess, MineAuthorizationError } from '@/lib/mineAuth';
import { updateShiftAllocationStatus, updateShiftAllocation, callFrappeApi } from '@/lib/frappe';
import { ShiftAllocationStatus, ShiftTypeOption } from '@/types/fleet';

const PERMITTED_STATUSES: ShiftAllocationStatus[] = [
  'Scheduled',
  'Active',
  'Completed',
  'Cancelled',
];

const PERMITTED_SHIFTS: ShiftTypeOption[] = [
  'Morning (06:00 - 14:00)',
  'Afternoon (14:00 - 22:00)',
  'Evening (14:00 - 22:00)',
  'Night (22:00 - 06:00)',
  'General (09:00 - 18:00)',
  'General / Full Day',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Forbidden: Insufficient permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const queryParams = new URLSearchParams({
      doctype: 'Vehicle Driver Shift Allocation',
      name: id,
    });

    const res = await callFrappeApi(
      `/api/method/frappe.client.get?${queryParams.toString()}`,
      `sid=${auth.sid}`,
      { method: 'GET' }
    );

    if (!res.message) {
      return NextResponse.json(
        { success: false, error: `Shift allocation '${id}' not found.` },
        { status: 404 }
      );
    }

    const s = res.message;

    // Enforce mine authorization boundary
    if (s.mine_site) {
      try {
        assertMineAccess(auth.user, s.mine_site);
      } catch (err: any) {
        if (err instanceof MineAuthorizationError) {
          return NextResponse.json({ success: false, error: err.message }, { status: 403 });
        }
        throw err;
      }
    } else if (auth.user.isUnassigned) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: You have no active mine assignments.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: s.name,
        vehicle: s.vehicle,
        licensePlate: s.license_plate,
        driver: s.driver,
        driverName: s.driver_name,
        mineSite: s.mine_site || '',
        mineSiteName: s.mine_site || '',
        shiftType: s.shift_type,
        allocationStart: s.allocation_start,
        allocationEnd: s.allocation_end,
        status: s.status,
        isPrimary: Boolean(s.is_primary),
        remarks: s.remarks,
        createdByUser: s.created_by_user,
        isTestRecord: Boolean(s.is_test_record),
      },
    });
  } catch (error: any) {
    console.error('Shift allocation GET [id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Forbidden: Insufficient permissions to modify shift allocations.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch existing shift allocation to enforce mine authorization
    const checkRes = await callFrappeApi(
      `/api/method/frappe.client.get?doctype=Vehicle+Driver+Shift+Allocation&name=${encodeURIComponent(id)}`,
      `sid=${auth.sid}`,
      { method: 'GET' }
    );
    if (!checkRes.message) {
      return NextResponse.json({ success: false, error: `Shift allocation '${id}' not found.` }, { status: 404 });
    }
    const currentMine = checkRes.message.mine_site;
    if (currentMine) {
      try {
        assertMineAccess(auth.user, currentMine);
      } catch (err: any) {
        if (err instanceof MineAuthorizationError) {
          return NextResponse.json({ success: false, error: err.message }, { status: 403 });
        }
        throw err;
      }
    } else if (auth.user.isUnassigned) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: You have no active mine assignments.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      vehicle,
      driver,
      mineSite,
      shiftType,
      allocationStart,
      allocationEnd,
      status,
      isPrimary,
      remarks,
    } = body;

    if (mineSite && mineSite !== currentMine) {
      try {
        assertMineAccess(auth.user, mineSite);
      } catch (err: any) {
        if (err instanceof MineAuthorizationError) {
          return NextResponse.json({ success: false, error: err.message }, { status: 403 });
        }
        throw err;
      }
    }

    if (status && !PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid shift status '${status}'. Permitted: ${PERMITTED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (shiftType && !PERMITTED_SHIFTS.includes(shiftType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid shift type '${shiftType}'. Permitted: ${PERMITTED_SHIFTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    await updateShiftAllocation(`sid=${auth.sid}`, id, {
      vehicle,
      driver,
      mineSite,
      shiftType,
      allocationStart,
      allocationEnd,
      status,
      isPrimary,
      remarks,
    });

    return NextResponse.json({
      success: true,
      message: `Shift allocation '${id}' updated successfully.`,
    });
  } catch (error: any) {
    console.error('Shift allocation PATCH [id] error:', error);
    let errorMsg = error.message || 'Internal server error.';
    if (errorMsg.includes('ValidationError:')) {
      errorMsg = errorMsg.split('ValidationError:')[1].split('\n')[0].trim();
    }
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const queryParams = new URLSearchParams({
      doctype: 'Vehicle Driver Shift Allocation',
      name: id,
    });

    const getRes = await callFrappeApi(
      `/api/method/frappe.client.get?${queryParams.toString()}`,
      `sid=${auth.sid}`,
      { method: 'GET' }
    );

    if (!getRes.message) {
      return NextResponse.json(
        { success: false, error: `Shift allocation '${id}' not found.` },
        { status: 404 }
      );
    }

    const isTestRecord = Boolean(getRes.message.is_test_record);
    const isAdmin = auth.user.role === 'Administrator';

    if (!isAdmin && !isTestRecord) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can delete genuine shift records.' },
        { status: 403 }
      );
    }

    await callFrappeApi('/api/method/frappe.client.delete', `sid=${auth.sid}`, {
      method: 'POST',
      body: JSON.stringify({
        doctype: 'Vehicle Driver Shift Allocation',
        name: id,
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Shift allocation '${id}' deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Shift allocation DELETE [id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

