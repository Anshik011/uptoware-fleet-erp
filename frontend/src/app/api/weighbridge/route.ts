import { NextRequest, NextResponse } from 'next/server';
import { getWeighbridgeData, confirmWeighbridgeScale } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { MiningTrip } from '@/types/fleet';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'weighbridge', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const mineSite = searchParams.get('mine_site');
    const material = searchParams.get('material');
    const query = searchParams.get('q')?.toLowerCase().trim();
    const includeTest = searchParams.get('include_test') === 'true';

    const validStatuses = ['PENDING', 'COMPLETED', 'ALL'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status filter '${status}'. Expected one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { metrics, pendingQueue, completedRecords } = await getWeighbridgeData(
      auth.sid,
      includeTest
    );

    let filteredPending = [...pendingQueue];
    let filteredCompleted = [...completedRecords];

    if (mineSite && mineSite !== 'ALL') {
      filteredPending = filteredPending.filter((t) => t.mineSite === mineSite);
      filteredCompleted = filteredCompleted.filter((t) => t.mineSite === mineSite);
    }

    if (material && material !== 'ALL') {
      filteredPending = filteredPending.filter((t) => t.materialType === material);
      filteredCompleted = filteredCompleted.filter((t) => t.materialType === material);
    }

    if (query) {
      const matchTrip = (t: MiningTrip) =>
        t.id.toLowerCase().includes(query) ||
        t.vehicle.toLowerCase().includes(query) ||
        t.driver.toLowerCase().includes(query) ||
        (t.driverName && t.driverName.toLowerCase().includes(query)) ||
        t.mineSite.toLowerCase().includes(query) ||
        (t.mineSiteName && t.mineSiteName.toLowerCase().includes(query)) ||
        t.destination.toLowerCase().includes(query) ||
        t.materialType.toLowerCase().includes(query) ||
        (t.challanNumber && t.challanNumber.toLowerCase().includes(query));

      filteredPending = filteredPending.filter(matchTrip);
      filteredCompleted = filteredCompleted.filter(matchTrip);
    }

    return NextResponse.json(
      {
        success: true,
        metrics,
        pendingCount: filteredPending.length,
        completedCount: filteredCompleted.length,
        pendingQueue: filteredPending,
        completedRecords: filteredCompleted,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /weighbridge GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch weighbridge data.' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'weighbridge', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to record weighbridge data.' },
        { status: 403 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const { tripId, grossWeightTons, tareWeightTons, challanNumber } = body;

    if (!tripId || typeof tripId !== 'string' || !tripId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mining Trip ID is strictly required.' },
        { status: 400 }
      );
    }

    if (grossWeightTons == null || tareWeightTons == null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both gross weight and tare weight are mandatory for scale confirmation.',
        },
        { status: 400 }
      );
    }

    const gross = Number(grossWeightTons);
    const tare = Number(tareWeightTons);

    if (isNaN(gross) || isNaN(tare) || gross <= 0 || tare <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gross weight and tare weight must be positive numeric values in tons.',
        },
        { status: 400 }
      );
    }

    if (gross < tare) {
      return NextResponse.json(
        {
          success: false,
          error: `Gross weight (${gross.toFixed(3)} T) cannot be less than tare weight (${tare.toFixed(3)} T).`,
        },
        { status: 400 }
      );
    }

    const updatedTrip = await confirmWeighbridgeScale(auth.sid, {
      tripId: tripId.trim(),
      grossWeightTons: gross,
      tareWeightTons: tare,
      challanNumber: challanNumber ? String(challanNumber).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: updatedTrip }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /weighbridge POST error:', err?.message || 'Error');
    const msg = err?.message || '';
    const status =
      err?.status === 417 || msg.includes('ValidationError') || msg.includes('cannot')
        ? 400
        : err?.status === 403 || msg.includes('Forbidden') || msg.includes('WorkflowTransitionError')
          ? 403
          : err?.status || 500;
    return NextResponse.json(
      { success: false, error: msg || 'Failed to record weighbridge measurement.' },
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
    { success: false, error: 'Method Not Allowed: Direct deletion of weighbridge records is prohibited.' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

