import { NextRequest, NextResponse } from 'next/server';
import { getDriverDetails, updateDriver } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { UpdateDriverInput, DriverStatus } from '@/types/fleet';

const PERMITTED_STATUSES: DriverStatus[] = ['Active', 'Suspended', 'Left'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[+0-9\s()-]{7,25}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const timestamp = Date.parse(dateStr);
  if (isNaN(timestamp)) return false;
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10) === dateStr;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!checkPermission(auth.user, 'drivers', 'view')) {
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

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid driver identifier.' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includeTest = searchParams.get('include_test') === 'true';

    const details = await getDriverDetails(auth.sid, id, includeTest);
    if (!details || !details.driver) {
      return NextResponse.json(
        { success: false, error: `Driver '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: details },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /drivers/[id] GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch driver details.' },
      { status }
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
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'drivers', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions to edit driver.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid driver identifier.' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const updatePayload: UpdateDriverInput = {};

    if (body.fullName !== undefined) {
      const fn = (body.fullName || '').trim();
      if (!fn || fn.length < 2 || fn.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Full name must be between 2 and 100 characters.' },
          { status: 400 }
        );
      }
      updatePayload.fullName = fn;
    }

    if (body.status !== undefined) {
      if (!PERMITTED_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Permitted: ${PERMITTED_STATUSES.join(', ')}.` },
          { status: 400 }
        );
      }

      // Reactivation compliance check: Cannot set status to Active if licence is missing or expired
      if (body.status === 'Active') {
        const existingDetails = await getDriverDetails(auth.sid, id, true);
        if (existingDetails?.driver && existingDetails.driver.status !== 'Active') {
          const effectiveExpiry = body.expiryDate !== undefined ? body.expiryDate : existingDetails.driver.expiryDate;
          if (!effectiveExpiry) {
            return NextResponse.json(
              { success: false, error: 'Cannot reactivate driver: Driving licence expiry date is required.' },
              { status: 400 }
            );
          }
          const expDate = new Date(effectiveExpiry);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expDate < today) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot reactivate driver: Driving licence expired on ${effectiveExpiry}. A valid, non-expired licence is required for active operational status.`,
              },
              { status: 400 }
            );
          }
        }
      }

      updatePayload.status = body.status;
    }

    if (body.cellNumber !== undefined) {
      const cell = (body.cellNumber || '').trim();
      if (cell && !PHONE_REGEX.test(cell)) {
        return NextResponse.json(
          { success: false, error: 'Invalid cellphone number format.' },
          { status: 400 }
        );
      }
      updatePayload.cellNumber = cell || undefined;
    }

    if (body.licenseNumber !== undefined) {
      const lic = (body.licenseNumber || '').trim();
      if (lic && (lic.length < 3 || lic.length > 30)) {
        return NextResponse.json(
          { success: false, error: 'License number must be between 3 and 30 characters.' },
          { status: 400 }
        );
      }
      updatePayload.licenseNumber = lic || undefined;
    }

    const dateFields = [
      { key: 'issuingDate', label: 'License issuing date' },
      { key: 'expiryDate', label: 'License expiry date' },
      { key: 'medicalFitnessExpiry', label: 'Medical fitness expiry date' },
    ];

    for (const field of dateFields) {
      if (body[field.key] !== undefined) {
        const val = body[field.key];
        if (val && typeof val === 'string' && val.trim()) {
          if (!isValidDate(val.trim())) {
            return NextResponse.json(
              { success: false, error: `Invalid date format for ${field.label}. Expected YYYY-MM-DD.` },
              { status: 400 }
            );
          }
          (updatePayload as any)[field.key] = val.trim();
        } else {
          (updatePayload as any)[field.key] = null;
        }
      }
    }

    if (body.safetyScore !== undefined && body.safetyScore !== null) {
      const score = Number(body.safetyScore);
      if (isNaN(score) || score < 0 || score > 100) {
        return NextResponse.json(
          { success: false, error: 'Safety score must be a number between 0 and 100.' },
          { status: 400 }
        );
      }
      updatePayload.safetyScore = score;
    }

    if (body.assignedVehicle !== undefined) {
      const veh = (body.assignedVehicle || '').trim();
      updatePayload.assignedVehicle = veh || undefined;
    }

    if (body.emergencyContactName !== undefined) {
      const eName = (body.emergencyContactName || '').trim();
      if (eName && eName.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Emergency contact name exceeds maximum length of 100 characters.' },
          { status: 400 }
        );
      }
      updatePayload.emergencyContactName = eName || undefined;
    }

    if (body.emergencyContactPhone !== undefined) {
      const ePhone = (body.emergencyContactPhone || '').trim();
      if (ePhone && !PHONE_REGEX.test(ePhone)) {
        return NextResponse.json(
          { success: false, error: 'Invalid emergency contact phone number format.' },
          { status: 400 }
        );
      }
      updatePayload.emergencyContactPhone = ePhone || undefined;
    }

    const updated = await updateDriver(auth.sid, id, updatePayload);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API /drivers/[id] PATCH error:', error?.message || 'Error');
    const status = error.status || 500;
    const cleanError =
      error.status === 404
        ? 'Driver not found.'
        : error.status === 403
          ? 'Forbidden: Insufficient permissions to update driver.'
          : error?.message?.includes('already assigned')
            ? error.message
            : 'Failed to update driver record.';
    return NextResponse.json({ success: false, error: cleanError }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Operational driver record deletion is prohibited.' },
    { status: 403, headers: { Allow: 'GET, PATCH, PUT' } }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, PATCH, PUT' } }
  );
}

