import { NextRequest, NextResponse } from 'next/server';
import { getVehicleDetails } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { assertMineAccess, MineAuthorizationError } from '@/lib/mineAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Vehicle ID required' }, { status: 400 });
    }

    const decodedId = decodeURIComponent(id).trim();

    // Input validation: bounds and path-traversal prevention
    if (decodedId.length > 50 || decodedId.includes('..') || decodedId.includes('/') || decodedId.includes('\\')) {
      return NextResponse.json({ success: false, error: 'Invalid vehicle identifier format.' }, { status: 400 });
    }

    const data = await getVehicleDetails(auth.sid, decodedId);
    if (!data.vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    // Enforce mine authorization boundary
    if (data.vehicle.customMineSite) {
      try {
        assertMineAccess(auth.user, data.vehicle.customMineSite);
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

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /vehicles/[id] error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle details.' },
      { status }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PUT(
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

    if (!checkPermission(auth.user, 'vehicles', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to edit vehicle.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();
    const body = await request.json();

    const payload: any = {};
    if (body.make !== undefined) payload.make = body.make;
    if (body.model !== undefined) payload.model = body.model;
    if (body.vehicleType !== undefined) payload.custom_vehicle_type = body.vehicleType;
    if (body.customTransportType !== undefined) payload.custom_transport_type = body.customTransportType;
    if (body.ownerName !== undefined) payload.custom_owner_name = body.ownerName;
    if (body.chassisNumber !== undefined) payload.chassis_no = body.chassisNumber;
    if (body.engineNumber !== undefined) payload.custom_engine_number = body.engineNumber;
    if (body.payloadCapacityTons !== undefined) payload.payload_capacity_tons = Number(body.payloadCapacityTons);
    if (body.lastOdometer !== undefined) payload.last_odometer = Number(body.lastOdometer);
    if (body.fuelType !== undefined) payload.fuel_type = body.fuelType;
    if (body.customMineSite !== undefined || body.mineSite !== undefined) {
      payload.custom_mine_site = body.customMineSite || body.mineSite;
    }
    if (body.status !== undefined) {
      payload.vehicle_status = body.status;
      payload.status = body.status;
    }
    if (body.insuranceExpiryDate !== undefined) payload.end_date = body.insuranceExpiryDate;
    if (body.fitnessExpiryDate !== undefined) payload.fitness_expiry_date = body.fitnessExpiryDate;
    if (body.pucExpiryDate !== undefined) payload.puc_expiry_date = body.pucExpiryDate;
    if (body.roadTaxExpiryDate !== undefined) payload.road_tax_expiry_date = body.roadTaxExpiryDate;
    if (body.permitExpiryDate !== undefined) payload.permit_expiry_date = body.permitExpiryDate;

    const { updateFrappeDoc } = await import('@/lib/frappe');
    const updated = await updateFrappeDoc('Vehicle', decodedId, payload, `sid=${auth.sid}`);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Vehicle ${decodedId} updated successfully.`,
    });
  } catch (error: any) {
    console.error('API /vehicles/[id] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update vehicle record.' },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

export async function DELETE(
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

    if (!checkPermission(auth.user, 'vehicles', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to delete vehicle.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    const { deleteVehicle } = await import('@/lib/frappe');
    await deleteVehicle(`sid=${auth.sid}`, decodedId);

    return NextResponse.json({
      success: true,
      message: `Vehicle ${decodedId} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('API /vehicles/[id] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete vehicle.' },
      { status: error.status || 500 }
    );
  }
}
