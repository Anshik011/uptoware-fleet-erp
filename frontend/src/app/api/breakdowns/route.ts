import { NextRequest, NextResponse } from 'next/server';
import { getBreakdowns, createBreakdown } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateBreakdownInput, BreakdownType, BreakdownSeverity } from '@/types/fleet';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'breakdowns', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const vehicle = searchParams.get('vehicle') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const breakdownType = searchParams.get('breakdown_type') || undefined;
    const query = searchParams.get('q')?.toLowerCase().trim();
    const includeTest = searchParams.get('include_test') === 'true';

    const { breakdowns, metrics } = await getBreakdowns(auth.sid, {
      status: status !== 'ALL' ? status : undefined,
      vehicle: vehicle && vehicle !== 'ALL' ? vehicle : undefined,
      severity: severity && severity !== 'ALL' ? severity : undefined,
      breakdownType: breakdownType && breakdownType !== 'ALL' ? breakdownType : undefined,
      includeTest,
    });

    let filtered = breakdowns;
    if (query) {
      filtered = filtered.filter(
        (b) =>
          b.id.toLowerCase().includes(query) ||
          b.vehicle.toLowerCase().includes(query) ||
          (b.breakdownType && b.breakdownType.toLowerCase().includes(query)) ||
          (b.severity && b.severity.toLowerCase().includes(query)) ||
          (b.breakdownLocation && b.breakdownLocation.toLowerCase().includes(query)) ||
          (b.reportedByName && b.reportedByName.toLowerCase().includes(query)) ||
          (b.assignedWorkshopName && b.assignedWorkshopName.toLowerCase().includes(query)) ||
          (b.description && b.description.toLowerCase().includes(query))
      );
    }

    return NextResponse.json(
      {
        success: true,
        metrics,
        count: filtered.length,
        breakdowns: filtered,
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
    console.error('API /breakdowns GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch breakdown records.' },
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

    if (!checkPermission(auth.user, 'breakdowns', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to report breakdown.' },
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
      breakdownDate,
      breakdownTime,
      breakdownType,
      severity,
      breakdownLocation,
      odometerReading,
      driver,
      mineSite,
      assignedWorkshop,
      description,
      repairDetails,
      laborCost,
      parts,
      isTestRecord,
    } = body;

    // Field Validations
    if (!vehicle || typeof vehicle !== 'string' || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle selection is strictly mandatory for breakdown incident.' },
        { status: 400 }
      );
    }

    if (!breakdownDate || typeof breakdownDate !== 'string' || !breakdownDate.trim()) {
      return NextResponse.json(
        { success: false, error: 'Breakdown date is strictly mandatory.' },
        { status: 400 }
      );
    }

    const validTypes: BreakdownType[] = [
      'Engine',
      'Hydraulic',
      'Tyre',
      'Electrical',
      'Transmission',
      'Brake',
      'Other',
    ];
    if (!breakdownType || !validTypes.includes(breakdownType as BreakdownType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid breakdown type '${breakdownType}'. Permitted types: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const validSeverities: BreakdownSeverity[] = ['Low', 'Medium', 'Critical'];
    if (!severity || !validSeverities.includes(severity as BreakdownSeverity)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid severity '${severity}'. Permitted severities: ${validSeverities.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!breakdownLocation || typeof breakdownLocation !== 'string' || !breakdownLocation.trim()) {
      return NextResponse.json(
        { success: false, error: 'Breakdown location description is mandatory.' },
        { status: 400 }
      );
    }

    const input: CreateBreakdownInput = {
      vehicle: vehicle.trim(),
      breakdownDate: breakdownDate.trim(),
      breakdownTime: breakdownTime ? String(breakdownTime).trim() : undefined,
      breakdownType: breakdownType as BreakdownType,
      severity: severity as BreakdownSeverity,
      breakdownLocation: breakdownLocation.trim(),
      odometerReading: odometerReading != null ? Number(odometerReading) : undefined,
      driver: driver ? String(driver).trim() : undefined,
      mineSite: mineSite ? String(mineSite).trim() : undefined,
      assignedWorkshop: assignedWorkshop ? String(assignedWorkshop).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      repairDetails: repairDetails ? String(repairDetails).trim() : undefined,
      laborCost: laborCost != null ? Number(laborCost) : undefined,
      parts: Array.isArray(parts) ? parts : undefined,
      isTestRecord: Boolean(isTestRecord),
    };

    const breakdown = await createBreakdown(auth.sid, input);

    return NextResponse.json(
      {
        success: true,
        message: `Breakdown incident '${breakdown.id}' reported successfully.`,
        breakdown,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /breakdowns POST error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to report breakdown incident.' },
      { status }
    );
  }
}
