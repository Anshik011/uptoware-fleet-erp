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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session required.' }, { status: 401 });
    }
    if (!checkPermission(auth.user, 'suppliers', 'manage')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();
    const body = await request.json();

    const payload: any = {};
    if (body.supplierName !== undefined) payload.supplier_name = body.supplierName;
    if (body.supplierGroup !== undefined) payload.supplier_group = body.supplierGroup;
    if (body.supplierType !== undefined) payload.supplier_type = body.supplierType;

    const { updateFrappeDoc } = await import('@/lib/frappe');
    const updated = await updateFrappeDoc('Supplier', decodedId, payload, `sid=${auth.sid}`);
    return NextResponse.json({ success: true, supplier: updated, message: 'Supplier updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session required.' }, { status: 401 });
    }
    if (!checkPermission(auth.user, 'suppliers', 'manage')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    const { deleteFrappeDoc } = await import('@/lib/frappe');
    await deleteFrappeDoc('Supplier', decodedId, `sid=${auth.sid}`);
    return NextResponse.json({ success: true, message: `Supplier ${decodedId} deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete supplier.' }, { status: 500 });
  }
}

