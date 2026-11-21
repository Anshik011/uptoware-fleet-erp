import { NextRequest, NextResponse } from 'next/server';
import { getVehicles, createVehicle, updateVehicle } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import { validateAndResolveMineFilter, assertMineAccess, MineAuthorizationError } from '@/lib/mineAuth';
import { CreateVehicleInput } from '@/types/fleet';

const PERMITTED_STATUSES = ['Active', 'On Trip', 'Breakdown', 'Under Maintenance', 'Out of Service', 'Withdrawn'];
const PERMITTED_COMPLIANCE = ['ALL', 'VALID', 'EXPIRING_SOON', 'EXPIRED'];
const PERMITTED_FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'CNG', 'Hybrid'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const LICENSE_PLATE_REGEX = /^[A-Za-z0-9\s-]+$/;

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
    if (!checkPermission(auth.user, 'vehicles', 'view')) {
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
    const compliance = searchParams.get('compliance') || 'ALL';
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    // 3. Resolve multi-mine filter boundary
    let mineFilter;
    try {
      mineFilter = validateAndResolveMineFilter(auth.user, requestedMine);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    // Validate query parameters
    if (status !== 'ALL' && !PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle status filter parameter.' },
        { status: 400 }
      );
    }

    if (!PERMITTED_COMPLIANCE.includes(compliance)) {
      return NextResponse.json(
        { success: false, error: 'Invalid statutory compliance filter parameter.' },
        { status: 400 }
      );
    }

    let vehicles = await getVehicles(auth.sid, includeTest);

    // Filter by mine authorization scope
    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      vehicles = vehicles.filter((v) => v.customMineSite === mineFilter.targetMine);
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      vehicles = vehicles.filter((v) => v.customMineSite && mineFilter.targetMines!.includes(v.customMineSite));
    }

    // Filter by search query
    if (query) {
      vehicles = vehicles.filter(
        (v) =>
          v.licensePlate.toLowerCase().includes(query) ||
          v.make.toLowerCase().includes(query) ||
          v.model.toLowerCase().includes(query) ||
          (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(query))
      );
    }

    // Filter by vehicle operational status
    if (status !== 'ALL') {
      vehicles = vehicles.filter((v) => v.status === status);
    }

    // Filter by compliance status
    if (compliance === 'EXPIRING_SOON') {
      vehicles = vehicles.filter((v) => v.statutory.overall === 'expiring_soon');
    } else if (compliance === 'EXPIRED') {
      vehicles = vehicles.filter((v) => v.statutory.overall === 'expired');
    } else if (compliance === 'VALID') {
      vehicles = vehicles.filter((v) => v.statutory.overall === 'valid');
    }

    return NextResponse.json(
      { success: true, count: vehicles.length, data: vehicles },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('API /vehicles GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicles.' },
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
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    // 2. Enforce server-side RBAC authorization: Vehicles "Manage" required
    if (!checkPermission(auth.user, 'vehicles', 'manage')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Insufficient operational permissions to register vehicles.',
        },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
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
        { success: false, error: 'Invalid vehicle payload.' },
        { status: 400 }
      );
    }

    // 4. Strict field validation
    const licensePlate = (body.licensePlate || '').trim();
    if (!licensePlate) {
      return NextResponse.json(
        { success: false, error: 'Registration number / license plate is required.' },
        { status: 400 }
      );
    }
    if (licensePlate.length < 3 || licensePlate.length > 20 || !LICENSE_PLATE_REGEX.test(licensePlate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid license plate format. Expected 3 to 20 alphanumeric characters or hyphens.' },
        { status: 400 }
      );
    }

    const make = (body.make || '').trim();
    if (!make) {
      return NextResponse.json(
        { success: false, error: 'Vehicle make is required.' },
        { status: 400 }
      );
    }
    if (make.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Vehicle make exceeds maximum length of 50 characters.' },
        { status: 400 }
      );
    }

    const model = (body.model || '').trim();
    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Vehicle model is required.' },
        { status: 400 }
      );
    }
    if (model.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Vehicle model exceeds maximum length of 50 characters.' },
        { status: 400 }
      );
    }

    // 5. Operational status validation
    const status = body.status || 'Active';
    if (!PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid operational status. Permitted values: ${PERMITTED_STATUSES.join(', ')}.` },
        { status: 400 }
      );
    }

    // 6. Numeric boundary validation
    const payloadCapacityTons = Number(body.payloadCapacityTons ?? 35);
    if (isNaN(payloadCapacityTons) || payloadCapacityTons <= 0 || payloadCapacityTons > 200) {
      return NextResponse.json(
        { success: false, error: 'Payload capacity must be a positive number between 0.1 and 200 tons.' },
        { status: 400 }
      );
    }

    const lastOdometer = Number(body.lastOdometer ?? 0);
    if (isNaN(lastOdometer) || lastOdometer < 0 || lastOdometer > 5000000) {
      return NextResponse.json(
        { success: false, error: 'Odometer reading must be a positive number between 0 and 5,000,000 km.' },
        { status: 400 }
      );
    }

    // 7. Fuel type validation
    const fuelType = body.fuelType || 'Diesel';
    if (!PERMITTED_FUEL_TYPES.includes(fuelType)) {
      return NextResponse.json(
        { success: false, error: `Invalid fuel type. Permitted values: ${PERMITTED_FUEL_TYPES.join(', ')}.` },
        { status: 400 }
      );
    }

    // 8. Statutory dates validation
    const dateFields = [
      { key: 'insuranceExpiryDate', label: 'Insurance expiry date' },
      { key: 'fitnessExpiryDate', label: 'Fitness expiry date' },
      { key: 'pucExpiryDate', label: 'PUC expiry date' },
      { key: 'roadTaxExpiryDate', label: 'Road tax expiry date' },
      { key: 'permitExpiryDate', label: 'Permit expiry date' },
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

    // 9. Operational Mine Site validation & authorization
    const mineSite = (body.customMineSite || body.mineSite || (auth.user.allowedMines.length === 1 ? auth.user.allowedMines[0] : '')).trim();
    if (!mineSite) {
      return NextResponse.json(
        { success: false, error: 'Operational mine site is required.' },
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

    const sanitizedInput: CreateVehicleInput = {
      licensePlate,
      make,
      model,
      status,
      payloadCapacityTons,
      lastOdometer,
      fuelType,
      customMineSite: mineSite,
      mineSite,
      vehicleType: body.vehicleType || undefined,
      customTransportType: (body.customTransportType || body.transportType || 'Transport') as 'Transport' | 'Non Transport',
      ownerName: body.ownerName || undefined,
      chassisNumber: body.chassisNumber || undefined,
      engineNumber: body.engineNumber || undefined,
      registrationDate: body.registrationDate || undefined,
      withdrawnDate: body.withdrawnDate || undefined,
      withdrawnReason: body.withdrawnReason || undefined,
      assignedDriverId: body.assignedDriverId || null,
      insuranceExpiryDate: body.insuranceExpiryDate || null,
      fitnessExpiryDate: body.fitnessExpiryDate || null,
      pucExpiryDate: body.pucExpiryDate || null,
      roadTaxExpiryDate: body.roadTaxExpiryDate || null,
      permitExpiryDate: body.permitExpiryDate || null,
    };

    const created = await createVehicle(auth.sid, sanitizedInput);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error('API /vehicles POST error:', error?.message || 'Error');
    const status = error.status || 500;
    const cleanError =
      error.status === 409
        ? 'A vehicle with this license plate already exists.'
        : error.status === 403
          ? 'Forbidden: Insufficient permissions to create vehicle in Frappe.'
          : error.message || 'Failed to create vehicle record.';
    return NextResponse.json({ success: false, error: cleanError }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'vehicles', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to update vehicles.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory vehicle identifier (id).' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (body.status && !PERMITTED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid vehicle status. Permitted: ${PERMITTED_STATUSES.join(', ')}.` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const updated = await updateVehicle(auth.sid, body.id, {
      status: body.status,
      vehicleType: body.vehicleType,
      withdrawnDate: body.withdrawnDate,
      withdrawnReason: body.withdrawnReason,
      assignedDriverId: body.assignedDriverId,
      customMineSite: body.customMineSite || body.mineSite,
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error('API /vehicles PATCH error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update vehicle.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST, PATCH' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST, PATCH' } }
  );
}
