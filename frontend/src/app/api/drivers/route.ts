import { NextRequest, NextResponse } from 'next/server';
import { getDrivers, createDriver } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateDriverInput, DriverStatus } from '@/types/fleet';

const PERMITTED_STATUSES: DriverStatus[] = ['Active', 'Suspended', 'Left'];
const PERMITTED_AVAILABILITY = ['ALL', 'ASSIGNED', 'UNASSIGNED'];
const PERMITTED_COMPLIANCE = ['ALL', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[+0-9\s()-]{7,25}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const timestamp = Date.parse(dateStr);
  if (isNaN(timestamp)) return false;
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10) === dateStr;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate request using user's Frappe session
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

    // 2. Enforce server-side RBAC authorization
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

    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const status = searchParams.get('status') || 'ALL';
    const availability = (searchParams.get('availability') || 'ALL').toUpperCase();
    const compliance = (searchParams.get('compliance') || 'ALL').toUpperCase();
    const includeTest = searchParams.get('include_test') === 'true';

    // Validate parameters
    if (status !== 'ALL' && !PERMITTED_STATUSES.includes(status as DriverStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid driver status filter parameter.' },
        { status: 400 }
      );
    }

    if (!PERMITTED_AVAILABILITY.includes(availability)) {
      return NextResponse.json(
        { success: false, error: 'Invalid availability filter parameter.' },
        { status: 400 }
      );
    }

    if (!PERMITTED_COMPLIANCE.includes(compliance)) {
      return NextResponse.json(
        { success: false, error: 'Invalid compliance filter parameter.' },
        { status: 400 }
      );
    }

    let drivers = await getDrivers(auth.sid, includeTest);

    // Search query filter
    if (query) {
      drivers = drivers.filter(
        (d) =>
          d.fullName.toLowerCase().includes(query) ||
          d.id.toLowerCase().includes(query) ||
          (d.licenseNumber && d.licenseNumber.toLowerCase().includes(query)) ||
          (d.cellNumber && d.cellNumber.toLowerCase().includes(query)) ||
          (d.assignedVehicle && d.assignedVehicle.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (status !== 'ALL') {
      drivers = drivers.filter((d) => d.status === status);
    }

    // Availability filter
    if (availability === 'ASSIGNED') {
      drivers = drivers.filter((d) => Boolean(d.assignedVehicle));
    } else if (availability === 'UNASSIGNED') {
      drivers = drivers.filter((d) => !d.assignedVehicle);
    }

    // Compliance filter
    if (compliance === 'VALID') {
      drivers = drivers.filter((d) => d.licenseStatus === 'valid');
    } else if (compliance === 'EXPIRING_SOON') {
      drivers = drivers.filter((d) => d.licenseStatus === 'expiring_soon');
    } else if (compliance === 'EXPIRED') {
      drivers = drivers.filter((d) => d.licenseStatus === 'expired');
    } else if (compliance === 'MISSING') {
      drivers = drivers.filter((d) => d.licenseStatus === 'missing');
    }

    return NextResponse.json(
      { success: true, count: drivers.length, data: drivers },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /drivers GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drivers directory.' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate request using user's Frappe session
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401 }
      );
    }

    // 2. Enforce strict server-side RBAC authorization for driver registration
    // Only Fleet Manager and Administrator can register drivers
    if (!checkPermission(auth.user, 'drivers', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions to register drivers.' },
        { status: 403 }
      );
    }

    // 3. Parse JSON safely
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid driver registration payload.' },
        { status: 400 }
      );
    }

    // 4. Validate mandatory field: fullName
    const fullName = (body.fullName || '').trim();
    if (!fullName) {
      return NextResponse.json(
        { success: false, error: 'Full name is required.' },
        { status: 400 }
      );
    }
    if (fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Full name must be between 2 and 100 characters.' },
        { status: 400 }
      );
    }

    // 5. Status validation
    const status: DriverStatus = body.status || 'Active';
    if (!PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid driver status. Permitted values: ${PERMITTED_STATUSES.join(', ')}.` },
        { status: 400 }
      );
    }

    // 6. Contact phone validations
    const cellNumber = (body.cellNumber || '').trim();
    if (cellNumber && !PHONE_REGEX.test(cellNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid cellphone number format.' },
        { status: 400 }
      );
    }

    const emergencyContactPhone = (body.emergencyContactPhone || '').trim();
    if (emergencyContactPhone && !PHONE_REGEX.test(emergencyContactPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid emergency contact phone number format.' },
        { status: 400 }
      );
    }

    const emergencyContactName = (body.emergencyContactName || '').trim();
    if (emergencyContactName && emergencyContactName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Emergency contact name exceeds maximum length of 100 characters.' },
        { status: 400 }
      );
    }

    // 7. License number validation
    const licenseNumber = (body.licenseNumber || '').trim();
    if (licenseNumber && (licenseNumber.length < 3 || licenseNumber.length > 30)) {
      return NextResponse.json(
        { success: false, error: 'License number must be between 3 and 30 characters.' },
        { status: 400 }
      );
    }

    // 8. Date validations
    const dateFields = [
      { key: 'issuingDate', label: 'License issuing date' },
      { key: 'expiryDate', label: 'License expiry date' },
      { key: 'medicalFitnessExpiry', label: 'Medical fitness expiry date' },
    ];

    for (const field of dateFields) {
      const val = body[field.key];
      if (val && typeof val === 'string' && val.trim()) {
        if (!isValidDate(val.trim())) {
          return NextResponse.json(
            { success: false, error: `Invalid date format for ${field.label}. Expected YYYY-MM-DD.` },
            { status: 400 }
          );
        }
      }
    }

    // 9. Safety score validation
    const safetyScore = body.safetyScore !== undefined && body.safetyScore !== null
      ? Number(body.safetyScore)
      : 100;
    if (isNaN(safetyScore) || safetyScore < 0 || safetyScore > 100) {
      return NextResponse.json(
        { success: false, error: 'Safety score must be a number between 0 and 100.' },
        { status: 400 }
      );
    }

    // 10. Assigned vehicle validation: if assigned, driver must be Active
    const assignedVehicle = (body.assignedVehicle || '').trim();
    if (assignedVehicle && status !== 'Active') {
      return NextResponse.json(
        { success: false, error: 'Vehicle can only be assigned to a driver with Active status.' },
        { status: 400 }
      );
    }

    const sanitizedInput: CreateDriverInput = {
      fullName,
      status,
      cellNumber: cellNumber || undefined,
      licenseNumber: licenseNumber || undefined,
      issuingDate: body.issuingDate ? body.issuingDate.trim() : undefined,
      expiryDate: body.expiryDate ? body.expiryDate.trim() : undefined,
      medicalFitnessExpiry: body.medicalFitnessExpiry ? body.medicalFitnessExpiry.trim() : undefined,
      safetyScore,
      assignedVehicle: assignedVehicle || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
    };

    const created = await createDriver(auth.sid, sanitizedInput);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error('API /drivers POST error:', error?.message || 'Error');
    const status = error.status || 500;
    const cleanError =
      error.status === 409
        ? 'A driver with this record already exists.'
        : error.status === 403
          ? 'Forbidden: Insufficient permissions to create driver in Frappe.'
          : error?.message?.includes('already assigned')
            ? error.message
            : 'Failed to create driver record.';
    return NextResponse.json({ success: false, error: cleanError }, { status });
  }
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}
