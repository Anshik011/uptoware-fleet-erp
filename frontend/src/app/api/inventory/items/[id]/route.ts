import { NextRequest, NextResponse } from 'next/server';
import { getSparePartDetails } from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'spareParts', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const partDetails = await getSparePartDetails(auth.sid, id);

    return NextResponse.json({
      success: true,
      item: partDetails,
    });
  } catch (error: any) {
    console.error('Error fetching spare part details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching spare part details' },
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
    if (!checkPermission(auth.user, 'spareParts', 'manage')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();
    const body = await request.json();

    const payload: any = {};
    if (body.itemName !== undefined) payload.item_name = body.itemName;
    if (body.valuationRate !== undefined) payload.valuation_rate = Number(body.valuationRate);
    if (body.stockUom !== undefined) payload.stock_uom = body.stockUom;
    if (body.partNumber !== undefined) payload.custom_part_number = body.partNumber;
    if (body.compatibleModel !== undefined) payload.custom_compatible_vehicle_model = body.compatibleModel;
    if (body.preferredSupplier !== undefined) payload.custom_preferred_supplier = body.preferredSupplier;

    const { updateFrappeDoc } = await import('@/lib/frappe');
    const updated = await updateFrappeDoc('Item', decodedId, payload, `sid=${auth.sid}`);
    return NextResponse.json({ success: true, data: updated, message: 'Spare part updated successfully.' });
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
    if (!checkPermission(auth.user, 'spareParts', 'manage')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    const { deleteFrappeDoc } = await import('@/lib/frappe');
    await deleteFrappeDoc('Item', decodedId, `sid=${auth.sid}`);
    return NextResponse.json({ success: true, message: `Spare part ${decodedId} deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete spare part.' }, { status: 500 });
  }
}

