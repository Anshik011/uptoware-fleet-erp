import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseReceipts, createPurchaseReceipt } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'procurement', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const supplier = searchParams.get('supplier') || undefined;
    const showTestRecords = searchParams.get('include_test') === 'true';

    const receipts = await getPurchaseReceipts(auth.sid, {
      search,
      supplier,
      showTestRecords,
    });

    let filtered = receipts;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          (r.purchaseOrder && r.purchaseOrder.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      receipts: filtered,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching purchase receipts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching purchase receipts' },
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

    if (!checkPermission(auth.user, 'procurement', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to receive goods.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.purchaseOrder) {
      return NextResponse.json(
        { success: false, error: 'Purchase Order is required to generate a Purchase Receipt.' },
        { status: 400 }
      );
    }

    const receipt = await createPurchaseReceipt(auth.sid, {
      purchaseOrder: body.purchaseOrder,
      postingDate: body.postingDate,
    });

    return NextResponse.json(
      { success: true, receipt, message: 'Goods received and submitted to inventory successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating purchase receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while receiving goods' },
      { status: error.status || 500 }
    );
  }
}

