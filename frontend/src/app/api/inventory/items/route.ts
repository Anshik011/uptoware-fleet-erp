import { NextRequest, NextResponse } from 'next/server';
import { getSpareParts, createSparePart } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateSparePartInput } from '@/types/fleet';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const itemGroup = searchParams.get('item_group') || undefined;
    const warehouse = searchParams.get('warehouse') || undefined;
    const status = searchParams.get('status') || undefined;
    const showTestRecords = searchParams.get('include_test') === 'true';

    const { items, metrics } = await getSpareParts(auth.sid, {
      search,
      itemGroup,
      warehouse,
      status,
      showTestRecords,
    });

    return NextResponse.json({
      success: true,
      items,
      metrics,
      totalCount: items.length,
    });
  } catch (error: any) {
    console.error('Error fetching spare parts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching spare parts' },
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

    if (!checkPermission(auth.user, 'spareParts', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create spare parts.' },
        { status: 403 }
      );
    }

    const body: CreateSparePartInput = await request.json();

    if (!body.itemCode || !body.itemCode.trim()) {
      return NextResponse.json(
        { success: false, error: 'Item Code is mandatory.' },
        { status: 400 }
      );
    }

    if (!body.itemName || !body.itemName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Item Name is mandatory.' },
        { status: 400 }
      );
    }

    const newPart = await createSparePart(auth.sid, body);

    return NextResponse.json(
      { success: true, item: newPart, message: 'Spare part created successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating spare part:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while creating spare part' },
      { status: error.status || 500 }
    );
  }
}

