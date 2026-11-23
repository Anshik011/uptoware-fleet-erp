import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { frappeFetch } from '@/lib/frappe';

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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Sales invoice ID required.' }, { status: 400 });
    }

    const res = await frappeFetch<{ data: any }>(
      `/api/resource/Sales%20Invoice/${encodeURIComponent(id)}`,
      { sessionCookie: auth.sid }
    );

    return NextResponse.json({ success: true, data: res.data });
  } catch (error: any) {
    console.error('API /sales/[id] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales invoice.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    if (!checkPermission(auth.user, 'revenue', 'manage') && !checkPermission(auth.user, 'inventory', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to approve/submit parts sales.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Sales invoice ID required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'submit';

    if (action === 'submit' || action === 'approve') {
      // 1. Fetch latest doc to verify state
      const getRes = await frappeFetch<{ data: any }>(
        `/api/resource/Sales%20Invoice/${encodeURIComponent(id)}`,
        { sessionCookie: auth.sid }
      );

      const existingDoc = getRes.data;
      if (!existingDoc) {
        return NextResponse.json({ success: false, error: 'Sales invoice not found.' }, { status: 404 });
      }

      if (existingDoc.docstatus === 1) {
        return NextResponse.json({
          success: true,
          message: 'Sales invoice is already approved and submitted.',
          data: existingDoc,
        });
      }

      // 2. Submit Sales Invoice in Frappe
      try {
        const submitRes = await frappeFetch<{ data: any }>(
          `/api/resource/Sales%20Invoice/${encodeURIComponent(id)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docstatus: 1 }),
            sessionCookie: auth.sid,
          }
        );
        return NextResponse.json({
          success: true,
          message: `Sales invoice ${id} approved and submitted successfully.`,
          data: submitRes.data,
        });
      } catch (submitErr: any) {
        // Fallback: try frappe.client.submit RPC method
        const rpcRes = await frappeFetch<{ message: any }>('/api/method/frappe.client.submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc: existingDoc }),
          sessionCookie: auth.sid,
        });
        return NextResponse.json({
          success: true,
          message: `Sales invoice ${id} approved and submitted successfully.`,
          data: rpcRes.message,
        });
      }
    } else if (action === 'cancel') {
      const cancelRes = await frappeFetch<{ data: any }>(
        `/api/resource/Sales%20Invoice/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docstatus: 2 }),
          sessionCookie: auth.sid,
        }
      );
      return NextResponse.json({
        success: true,
        message: `Sales invoice ${id} cancelled.`,
        data: cancelRes.data,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action '${action}'.` }, { status: 400 });
  } catch (error: any) {
    console.error('API /sales/[id] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process sales invoice action.' },
      { status: 500 }
    );
  }
}
