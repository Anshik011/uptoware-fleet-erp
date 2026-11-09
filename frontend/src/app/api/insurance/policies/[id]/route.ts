import { NextRequest, NextResponse } from 'next/server';
import { getInsurancePolicyDetails, updateInsurancePolicyStatus } from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'insurance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const policy = await getInsurancePolicyDetails(auth.sid, id);

    return NextResponse.json({
      success: true,
      policy,
    });
  } catch (error: any) {
    console.error('Error fetching policy details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching policy details' },
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

    if (!checkPermission(auth.user, 'insurance', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to manage insurance policies.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action as 'activate' | 'cancel';

    if (!action || !['activate', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be either 'activate' or 'cancel'." },
        { status: 400 }
      );
    }

    const cancelReason = (body.cancellationReason || body.reason || '').trim();
    if (action === 'cancel' && !cancelReason) {
      return NextResponse.json(
        { success: false, error: 'Cancellation reason is mandatory when cancelling a policy.' },
        { status: 400 }
      );
    }

    const policy = await updateInsurancePolicyStatus(auth.sid, id, action, cancelReason);

    return NextResponse.json({
      success: true,
      policy,
      message: action === 'activate' ? 'Policy activated successfully.' : 'Policy cancelled successfully.',
    });
  } catch (error: any) {
    console.error('Error updating policy status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while updating policy status' },
      { status: error.status || 500 }
    );
  }
}
