import { NextRequest, NextResponse } from 'next/server';
import { getSuppliers, createSupplier } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateSupplierInput } from '@/types/fleet';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const group = searchParams.get('group') || undefined;
    const preferredOnly = searchParams.get('preferred_only') === 'true';
    const showTestRecords = searchParams.get('include_test') === 'true';

    const { suppliers, metrics } = await getSuppliers(auth.sid, {
      search,
      group,
      preferredOnly,
      showTestRecords,
    });

    let filtered = suppliers;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.supplierName.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.pan && s.pan.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      suppliers: filtered,
      metrics,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching suppliers' },
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

    if (!checkPermission(auth.user, 'suppliers', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create suppliers.' },
        { status: 403 }
      );
    }

    const body: CreateSupplierInput = await request.json();

    if (!body.supplierName || !body.supplierName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Supplier Name is mandatory.' },
        { status: 400 }
      );
    }

    const supplier = await createSupplier(auth.sid, body);

    return NextResponse.json(
      { success: true, supplier, message: 'Supplier registered successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while creating supplier' },
      { status: error.status || 500 }
    );
  }
}

