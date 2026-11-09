import { NextRequest, NextResponse } from 'next/server';
import { getStockMovements, createStockEntry } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateStockEntryInput } from '@/types/fleet';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'stockMovements', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const entryType = searchParams.get('entry_type') || undefined;
    const vehicle = searchParams.get('vehicle') || undefined;
    const breakdown = searchParams.get('breakdown') || undefined;
    const warehouse = searchParams.get('warehouse') || undefined;
    const showTestRecords = searchParams.get('include_test') === 'true';

    const { movements, totalCount } = await getStockMovements(auth.sid, {
      search,
      entryType,
      vehicle,
      breakdown,
      warehouse,
      showTestRecords,
    });

    return NextResponse.json({
      success: true,
      movements,
      totalCount,
    });
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching stock movements' },
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

    if (!checkPermission(auth.user, 'stockMovements', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to execute stock movements.' },
        { status: 403 }
      );
    }

    const body: CreateStockEntryInput = await request.json();

    if (!body.entryType) {
      return NextResponse.json(
        { success: false, error: 'Entry Type (Material Issue, Material Receipt, Material Transfer) is mandatory.' },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item line is required for stock movements.' },
        { status: 400 }
      );
    }

    for (const item of body.items) {
      if (!item.itemCode) {
        return NextResponse.json(
          { success: false, error: 'Item Code is required for all item rows.' },
          { status: 400 }
        );
      }
      if (!item.qty || Number(item.qty) <= 0) {
        return NextResponse.json(
          { success: false, error: `Quantity must be greater than zero for part '${item.itemCode}'.` },
          { status: 400 }
        );
      }
    }

    const movement = await createStockEntry(auth.sid, body);

    return NextResponse.json(
      { success: true, movement, message: 'Stock movement executed and submitted successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error executing stock movement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while executing stock movement' },
      { status: error.status || 500 }
    );
  }
}

