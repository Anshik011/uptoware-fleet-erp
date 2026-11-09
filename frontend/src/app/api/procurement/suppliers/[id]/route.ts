import { NextRequest, NextResponse } from 'next/server';
import { getSupplierDetails } from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'suppliers', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supplierDetails = await getSupplierDetails(auth.sid, id);

    return NextResponse.json({
      success: true,
      supplier: supplierDetails,
    });
  } catch (error: any) {
    console.error('Error fetching supplier details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching supplier details' },
      { status: error.status || 500 }
    );
  }
}

