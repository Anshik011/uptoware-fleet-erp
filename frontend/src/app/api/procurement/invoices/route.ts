import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseInvoices } from '@/lib/frappe';
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
    const status = searchParams.get('status') || undefined;
    const showTestRecords = searchParams.get('include_test') === 'true';

    const invoices = await getPurchaseInvoices(auth.sid, {
      search,
      supplier,
      status,
      showTestRecords,
    });

    let filtered = invoices;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.supplier.toLowerCase().includes(q) ||
          (i.purchaseOrder && i.purchaseOrder.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      invoices: filtered,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching purchase invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching purchase invoices' },
      { status: error.status || 500 }
    );
  }
}

