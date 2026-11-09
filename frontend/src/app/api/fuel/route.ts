import { NextRequest, NextResponse } from 'next/server';
import { getFuelLogs, createFuelLog } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateFuelLogInput, FuelSource, FuelPaymentMethod } from '@/types/fleet';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'fuel', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const vehicle = searchParams.get('vehicle') || undefined;
    const source = searchParams.get('source') || undefined;
    const mineSite = searchParams.get('mine_site') || undefined;
    const query = searchParams.get('q')?.toLowerCase().trim();
    const includeTest = searchParams.get('include_test') === 'true';

    const validStatuses = ['DRAFT', 'APPROVED', 'REJECTED', 'ALL'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status filter '${status}'. Expected one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { logs, metrics } = await getFuelLogs(auth.sid, {
      status: status !== 'ALL' ? status : undefined,
      vehicle: vehicle && vehicle !== 'ALL' ? vehicle : undefined,
      source: source && source !== 'ALL' ? source : undefined,
      mineSite: mineSite && mineSite !== 'ALL' ? mineSite : undefined,
      includeTest,
    });

    let filteredLogs = logs;
    if (query) {
      filteredLogs = filteredLogs.filter(
        (l) =>
          l.id.toLowerCase().includes(query) ||
          l.vehicle.toLowerCase().includes(query) ||
          (l.driver && l.driver.toLowerCase().includes(query)) ||
          (l.driverName && l.driverName.toLowerCase().includes(query)) ||
          (l.mineSite && l.mineSite.toLowerCase().includes(query)) ||
          (l.mineSiteName && l.mineSiteName.toLowerCase().includes(query)) ||
          (l.fuelStation && l.fuelStation.toLowerCase().includes(query)) ||
          (l.remarks && l.remarks.toLowerCase().includes(query))
      );
    }

    return NextResponse.json(
      {
        success: true,
        metrics,
        count: filteredLogs.length,
        logs: filteredLogs,
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
    console.error('API /fuel GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch fuel dispensation data.' },
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

    if (!checkPermission(auth.user, 'fuel', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to record fuel log.' },
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

    const {
      vehicle,
      fuelDate,
      fuelSource,
      odometerReading,
      quantityLitres,
      ratePerLitre,
      totalCost,
      isFullTank,
      driver,
      mineSite,
      paymentMethod,
      fuelStation,
      remarks,
      isTestRecord,
    } = body;

    // Field Validations
    if (!vehicle || typeof vehicle !== 'string' || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle selection is strictly mandatory for fuel entry.' },
        { status: 400 }
      );
    }

    if (!fuelDate || typeof fuelDate !== 'string' || !fuelDate.trim()) {
      return NextResponse.json(
        { success: false, error: 'Refuel date is strictly mandatory.' },
        { status: 400 }
      );
    }

    const validSources: FuelSource[] = ['Site Bowser', 'External Pump'];
    if (!fuelSource || !validSources.includes(fuelSource as FuelSource)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid fuel source '${fuelSource}'. Expected 'Site Bowser' or 'External Pump'.`,
        },
        { status: 400 }
      );
    }

    if (odometerReading == null || isNaN(Number(odometerReading)) || Number(odometerReading) < 0) {
      return NextResponse.json(
        { success: false, error: 'Odometer reading must be a non-negative integer.' },
        { status: 400 }
      );
    }

    if (quantityLitres == null || isNaN(Number(quantityLitres)) || Number(quantityLitres) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity in litres must be a positive numeric value.' },
        { status: 400 }
      );
    }

    if (ratePerLitre == null || isNaN(Number(ratePerLitre)) || Number(ratePerLitre) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Rate per litre must be a positive numeric value.' },
        { status: 400 }
      );
    }

    const input: CreateFuelLogInput = {
      vehicle: vehicle.trim(),
      fuelDate: fuelDate.trim(),
      fuelSource: fuelSource as FuelSource,
      odometerReading: Math.floor(Number(odometerReading)),
      quantityLitres: Number(quantityLitres),
      ratePerLitre: Number(ratePerLitre),
      totalCost: totalCost != null ? Number(totalCost) : undefined,
      isFullTank: Boolean(isFullTank),
      driver: driver ? String(driver).trim() : undefined,
      mineSite: mineSite ? String(mineSite).trim() : undefined,
      paymentMethod: (paymentMethod as FuelPaymentMethod) || undefined,
      fuelStation: fuelStation ? String(fuelStation).trim() : undefined,
      remarks: remarks ? String(remarks).trim() : undefined,
      isTestRecord: Boolean(isTestRecord),
    };

    const newLog = await createFuelLog(auth.sid, input);
    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /fuel POST error:', err?.message || 'Error');
    const msg = err?.message || '';
    const status =
      err?.status === 417 || msg.includes('ValidationError') || msg.includes('cannot') || msg.includes('lower')
        ? 400
        : err?.status === 403 || msg.includes('Forbidden')
          ? 403
          : err?.status || 500;
    return NextResponse.json(
      { success: false, error: msg || 'Failed to create fuel log record.' },
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
    { success: false, error: 'Method Not Allowed: Direct deletion of fuel logs is prohibited.' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

