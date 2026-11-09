import { NextRequest, NextResponse } from 'next/server';
import { getSalesInvoiceDetail } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'revenue', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view invoice details.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await params;
    const invoice = await getSalesInvoiceDetail(auth.sid, id);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Sales Invoice '${id}' not found.` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, invoice },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /api/finance/revenue/[id] error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch sales invoice details' },
      { status: error?.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

