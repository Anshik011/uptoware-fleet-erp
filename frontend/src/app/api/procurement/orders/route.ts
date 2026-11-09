import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrders, createPurchaseOrder } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreatePurchaseOrderInput } from '@/types/fleet';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'purchaseOrders', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;
    const supplier = searchParams.get('supplier') || undefined;
    const vehicle = searchParams.get('vehicle') || undefined;
    const showTestRecords = searchParams.get('include_test') === 'true';

    const { orders, metrics } = await getPurchaseOrders(auth.sid, {
      search,
      status,
      supplier,
      vehicle,
      showTestRecords,
    });

    let filtered = orders;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.supplier.toLowerCase().includes(q) ||
          (o.vehicle && o.vehicle.toLowerCase().includes(q)) ||
          (o.vehicleBreakdown && o.vehicleBreakdown.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      orders: filtered,
      metrics,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching purchase orders' },
      { status: error.status || 500 }
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

    if (!checkPermission(auth.user, 'purchaseOrders', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create purchase orders.' },
        { status: 403 }
      );
    }

    const body: CreatePurchaseOrderInput = await request.json();

    if (!body.supplier || !body.supplier.trim()) {
      return NextResponse.json(
        { success: false, error: 'Supplier is mandatory.' },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item line is required for purchase orders.' },
        { status: 400 }
      );
    }

    const order = await createPurchaseOrder(auth.sid, body);

    return NextResponse.json(
      { success: true, order, message: 'Purchase Order created successfully in Draft.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while creating purchase order' },
      { status: error.status || 500 }
    );
  }
}

