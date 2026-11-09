import { NextRequest, NextResponse } from 'next/server';
import { getPaymentEntryDetail } from '@/lib/frappe';
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

    if (!checkPermission(auth.user, 'collections', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view payment details.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { id } = await params;
    const payment = await getPaymentEntryDetail(auth.sid, id);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: `Payment Entry '${id}' not found.` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, payment },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /api/finance/collections/[id] error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch payment details' },
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

