import { NextRequest, NextResponse } from 'next/server';
import {
  getMiningTrips,
  createMiningTrip,
  applyTripTransition,
  getDispatchSummary,
  getMiningTripMaterialOptions,
} from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateMiningTripInput } from '@/types/fleet';

const PERMITTED_QUEUE_STATUSES = [
  'ALL',
  'Pending',
  'Draft',
  'Dispatched',
  'Weighbridge Confirmed',
  'Awaiting Weighbridge',
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

    if (!checkPermission(auth.user, 'dispatch', 'view')) {
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

    if (!PERMITTED_QUEUE_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid dispatch queue status filter parameter.' },
        { status: 400 }
      );
    }

    if (material !== 'ALL') {
      const validMaterials = await getMiningTripMaterialOptions(auth.sid);
      if (!validMaterials.includes(material)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid material filter parameter '${material}'. Permitted options: ${validMaterials.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Fetch summary metrics & live queue in parallel
    const [metrics, allTrips] = await Promise.all([
      getDispatchSummary(auth.sid, includeTest),
      getMiningTrips(auth.sid, includeTest, {
        mineSite: mineSite || undefined,
        vehicle: vehicle || undefined,
        driver: driver || undefined,
        material: material !== 'ALL' ? material : undefined,
      }),
    ]);

    // Filter queue based on status parameter
    let queue = allTrips;
    if (status === 'Pending' || status === 'Draft') {
      queue = queue.filter((t) => t.tripStatus === 'Draft');
    } else if (status === 'Dispatched') {
      queue = queue.filter((t) => t.tripStatus === 'Dispatched');
    } else if (status === 'Awaiting Weighbridge') {
      queue = queue.filter(
        (t) => t.tripStatus === 'Dispatched' || t.tripStatus === 'Weighbridge Confirmed'
      );
    } else if (status === 'Delivered') {
      queue = queue.filter((t) => t.tripStatus === 'Delivered');
    } else if (status === 'Cancelled') {
      queue = queue.filter((t) => t.tripStatus === 'Cancelled');
    } else if (status === 'Approved') {
      queue = queue.filter((t) => t.tripStatus === 'Approved');
    }

    if (query) {
      queue = queue.filter(
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
      {
        success: true,
        metrics,
        count: queue.length,
        queue,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /dispatch GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch dispatch operations data.' },
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

    if (!checkPermission(auth.user, 'dispatch', 'manage')) {
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
      tripId,
      action,
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

    // Action mode 1: Dispatch an existing Draft trip
    if (tripId) {
      if (action !== 'Dispatch') {
        return NextResponse.json(
          { success: false, error: `Invalid dispatch action '${action}'. Expected 'Dispatch'.` },
          { status: 400 }
        );
      }
      const updatedTrip = await applyTripTransition(auth.sid, tripId, { action: 'Dispatch' });
      return NextResponse.json({ success: true, data: updatedTrip });
    }

    // Action mode 2: Create a new trip (and optionally dispatch immediately)
    if (!vehicle || typeof vehicle !== 'string' || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle selection is mandatory for dispatch.' },
        { status: 400 }
      );
    }

    if (!driver || typeof driver !== 'string' || !driver.trim()) {
      return NextResponse.json(
        { success: false, error: 'Driver selection is mandatory for dispatch.' },
        { status: 400 }
      );
    }

    if (!mineSite || typeof mineSite !== 'string' || !mineSite.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mine Site selection is mandatory for dispatch.' },
        { status: 400 }
      );
    }

    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return NextResponse.json(
        { success: false, error: 'Destination is mandatory for dispatch.' },
        { status: 400 }
      );
    }

    if (!materialType || typeof materialType !== 'string' || !materialType.trim()) {
      return NextResponse.json(
        { success: false, error: 'Material type is mandatory for dispatch.' },
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

    let trip = await createMiningTrip(auth.sid, input);

    // If client requested immediate dispatch upon creation
    if (action === 'Dispatch') {
      trip = await applyTripTransition(auth.sid, trip.id, { action: 'Dispatch' });
    }

    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (error: any) {
    console.error('API /dispatch POST error:', error?.message || 'Error');
    const msg = error?.message || '';
    const status =
      error.status === 417 || msg.includes('ValidationError') || msg.includes('cannot')
        ? 400
        : error.status === 403 || msg.includes('Forbidden')
          ? 403
          : error.status || 500;
    return NextResponse.json(
      { success: false, error: msg || 'Failed to execute dispatch action.' },
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
    { success: false, error: 'Method Not Allowed: Direct deletion of dispatch records is prohibited.' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

