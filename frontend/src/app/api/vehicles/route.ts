import { NextRequest, NextResponse } from 'next/server';
import { getVehicles, createVehicle } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import { CreateVehicleInput } from '@/types/fleet';

const PERMITTED_STATUSES = ['Active', 'Breakdown', 'Under Maintenance', 'Out of Service'];
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
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

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

    const sanitizedInput: CreateVehicleInput = {
      licensePlate,
      make,
      model,
      status,
      payloadCapacityTons,
      lastOdometer,
      fuelType,
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
          : 'Failed to create vehicle record.';
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

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}
