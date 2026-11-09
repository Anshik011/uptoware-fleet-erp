import { NextRequest, NextResponse } from 'next/server';
import { getMiningTrips, createMiningTrip, getMiningTripMaterialOptions } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateMiningTripInput, TripStatus } from '@/types/fleet';

const PERMITTED_STATUSES: (TripStatus | 'ALL')[] = [
  'ALL',
  'Draft',
  'Dispatched',
  'Weighbridge Confirmed',
  'Approved',
  'Delivered',
  'Cancelled',
];

export async function GET(request: NextRequest) {
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

    if (!checkPermission(auth.user, 'trips', 'view')) {
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
    const mineSite = searchParams.get('mine_site') || '';
    const vehicle = searchParams.get('vehicle') || '';
    const driver = searchParams.get('driver') || '';
    const material = searchParams.get('material') || 'ALL';
    const includeTest = searchParams.get('include_test') === 'true';

    if (!PERMITTED_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trip status filter parameter.' },
        { status: 400 }
      );
    }

    if (material !== 'ALL') {
      const validMaterials = await getMiningTripMaterialOptions(auth.sid);
      if (!validMaterials.includes(material)) {
        return NextResponse.json(
          { success: false, error: `Invalid material filter parameter '${material}'. Permitted options: ${validMaterials.join(', ')}` },
          { status: 400 }
        );
      }
    }

    let trips = await getMiningTrips(auth.sid, includeTest, {
      status: status !== 'ALL' ? status : undefined,
      mineSite: mineSite || undefined,
      vehicle: vehicle || undefined,
      driver: driver || undefined,
      material: material !== 'ALL' ? material : undefined,
    });

    if (query) {
      trips = trips.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.vehicle.toLowerCase().includes(query) ||
          t.driver.toLowerCase().includes(query) ||
          (t.driverName && t.driverName.toLowerCase().includes(query)) ||
          t.mineSite.toLowerCase().includes(query) ||
          (t.mineSiteName && t.mineSiteName.toLowerCase().includes(query)) ||
          t.destination.toLowerCase().includes(query) ||
          t.materialType.toLowerCase().includes(query) ||
          (t.challanNumber && t.challanNumber.toLowerCase().includes(query))
      );
    }

    return NextResponse.json(
      { success: true, count: trips.length, data: trips },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /trips GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch mining trips.' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'trips', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions.' },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const {
      vehicle,
      driver,
      mineSite,
      destination,
      materialType,
      dispatchDateTime,
      ratePerTon,
      openingOdometer,
      challanNumber,
      isTestRecord,
    } = body;

    if (!vehicle || typeof vehicle !== 'string' || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle selection is mandatory for trip creation.' },
        { status: 400 }
      );
    }

    if (!driver || typeof driver !== 'string' || !driver.trim()) {
      return NextResponse.json(
        { success: false, error: 'Driver selection is mandatory for trip creation.' },
        { status: 400 }
      );
    }

    if (!mineSite || typeof mineSite !== 'string' || !mineSite.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mine Site selection is mandatory for trip creation.' },
        { status: 400 }
      );
    }

    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return NextResponse.json(
        { success: false, error: 'Destination is mandatory for trip creation.' },
        { status: 400 }
      );
    }

    if (!materialType || typeof materialType !== 'string' || !materialType.trim()) {
      return NextResponse.json(
        { success: false, error: 'Material type is mandatory for trip creation.' },
        { status: 400 }
      );
    }

    const validMaterials = await getMiningTripMaterialOptions(auth.sid);
    if (!validMaterials.includes(materialType.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid material type '${materialType}'. Must be one of: ${validMaterials.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const input: CreateMiningTripInput = {
      vehicle: vehicle.trim(),
      driver: driver.trim(),
      mineSite: mineSite.trim(),
      destination: destination.trim(),
      materialType: materialType.trim(),
      dispatchDateTime: dispatchDateTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
      ratePerTon: ratePerTon != null ? Number(ratePerTon) : undefined,
      openingOdometer: openingOdometer != null ? Number(openingOdometer) : undefined,
      challanNumber: challanNumber ? String(challanNumber).trim() : undefined,
      isTestRecord: Boolean(isTestRecord),
    };

    const newTrip = await createMiningTrip(auth.sid, input);
    return NextResponse.json({ success: true, data: newTrip }, { status: 201 });
  } catch (error: any) {
    console.error('API /trips POST error:', error?.message || 'Error');
    const msg = error?.message || '';
    const status =
      error.status === 417 || msg.includes('ValidationError') || msg.includes('cannot')
        ? 400
        : error.status === 403 || msg.includes('Forbidden')
          ? 403
          : error.status || 500;
    return NextResponse.json(
      { success: false, error: msg || 'Failed to create mining trip.' },
      { status }
    );
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
