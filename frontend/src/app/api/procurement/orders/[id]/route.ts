import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrderDetails, applyPurchaseOrderWorkflow } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const order = await getPurchaseOrderDetails(auth.sid, id);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Error fetching purchase order details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching purchase order details' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Forbidden: You do not have permission to manage purchase order workflows.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action; // 'submit' | 'cancel'

    if (action !== 'submit' && action !== 'cancel') {
      return NextResponse.json(
        { success: false, error: "Invalid action. Supported actions are 'submit' and 'cancel'." },
        { status: 400 }
      );
    }

    const updated = await applyPurchaseOrderWorkflow(auth.sid, id, action);

    return NextResponse.json({
      success: true,
      order: updated,
      message: `Purchase Order ${action === 'submit' ? 'approved and submitted' : 'cancelled'} successfully.`,
    });
  } catch (error: any) {
    console.error('Error updating purchase order status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while updating purchase order' },
      { status: error.status || 500 }
    );
  }
}

