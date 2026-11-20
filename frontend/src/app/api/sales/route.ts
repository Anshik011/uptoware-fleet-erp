import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { frappeFetch } from '@/lib/frappe';
import { resolveUserMineScope, validateAndResolveMineFilter, MineAuthorizationError } from '@/lib/mineAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'revenue', 'view') && !checkPermission(auth.user, 'inventory', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view parts sales.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicle = searchParams.get('vehicle');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const requestedMine = searchParams.get('mine_site');

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, requestedMine || undefined);

    const filters: any[] = [['docstatus', '!=', 2]];
    if (vehicle && vehicle !== 'ALL') {
      filters.push(['custom_vehicle', '=', vehicle]);
    }
    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }
    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      filters.push(['custom_mine_site', '=', mineFilter.targetMine]);
    }

    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Sales%20Invoice?fields=${encodeURIComponent(
        JSON.stringify([
          'name',
          'customer',
          'posting_date',
          'grand_total',
          'total_qty',
          'status',
          'docstatus',
          'custom_vehicle',
          'custom_mine_site',
          'remarks',
        ])
      )}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=100`,
      { sessionCookie: auth.sid }
    );

    const invoices = res.data || [];

    // Fetch line items for these invoices
    const invoiceNames = invoices.map((i) => i.name);
    let itemsByInvoice: Record<string, any[]> = {};
    if (invoiceNames.length > 0) {
      try {
        const itemRes = await frappeFetch<{ data: any[] }>(
          `/api/resource/Sales%20Invoice%20Item?fields=${encodeURIComponent(
            JSON.stringify(['parent', 'item_code', 'item_name', 'qty', 'rate', 'amount'])
          )}&filters=${encodeURIComponent(
            JSON.stringify([['parent', 'in', invoiceNames]])
          )}&limit_page_length=500`,
          { sessionCookie: auth.sid }
        );
        for (const it of itemRes.data || []) {
          if (!itemsByInvoice[it.parent]) itemsByInvoice[it.parent] = [];
          itemsByInvoice[it.parent].push({
            itemCode: it.item_code,
            itemName: it.item_name || it.item_code,
            qty: Number(it.qty || 0),
            rate: Number(it.rate || 0),
            amount: Number(it.amount || 0),
          });
        }
      } catch (err) {
        console.warn('Could not fetch sales invoice items:', err);
      }
    }

    const sales = invoices.map((inv) => ({
      id: inv.name,
      name: inv.name,
      customer: inv.customer,
      postingDate: inv.posting_date,
      vehicle: inv.custom_vehicle || null,
      mineSite: inv.custom_mine_site || null,
      grandTotal: Number(inv.grand_total || 0),
      totalQty: Number(inv.total_qty || 0),
      status: inv.status,
      remarks: inv.remarks || null,
      items: itemsByInvoice[inv.name] || [],
    }));

    return NextResponse.json({
      success: true,
      data: sales,
      count: sales.length,
    });
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('API /sales GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error fetching sales.' },
      { status: 500 }
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

    if (!checkPermission(auth.user, 'revenue', 'manage') && !checkPermission(auth.user, 'inventory', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to record parts sales.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customer = 'JBR Eastern Pvt Ltd',
      postingDate,
      vehicle,
      mineSite,
      itemCode,
      itemName,
      qty,
      rate,
      remarks,
    } = body;

    if (!itemCode || !qty || Number(qty) <= 0 || rate == null || Number(rate) < 0) {
      return NextResponse.json(
        { success: false, error: 'Item, positive quantity, and rate are required.' },
        { status: 400 }
      );
    }

    const numericQty = Number(qty);
    const numericRate = Number(rate);
    const amount = Math.round(numericQty * numericRate * 100) / 100;
    const dateStr = postingDate || new Date().toISOString().split('T')[0];

    const payload = {
      doctype: 'Sales Invoice',
      customer: customer || 'JBR Eastern Pvt Ltd',
      posting_date: dateStr,
      due_date: dateStr,
      custom_vehicle: vehicle || null,
      custom_mine_site: mineSite || null,
      remarks: remarks || `Parts sale for vehicle ${vehicle || 'General'}`,
      update_stock: 0,
      items: [
        {
          item_code: itemCode,
          item_name: itemName || itemCode,
          qty: numericQty,
          rate: numericRate,
          amount: amount,
        },
      ],
    };

    const res = await frappeFetch<{ data: any }>('/api/resource/Sales%20Invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      sessionCookie: auth.sid,
    });

    const created = res.data;

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.name,
          name: created.name,
          customer: created.customer,
          postingDate: created.posting_date,
          vehicle: created.custom_vehicle,
          mineSite: created.custom_mine_site,
          grandTotal: created.grand_total || amount,
          items: [
            {
              itemCode,
              itemName: itemName || itemCode,
              qty: numericQty,
              rate: numericRate,
              amount,
            },
          ],
        },
        message: 'Parts sale recorded successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API /sales POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error recording parts sale.' },
      { status: 500 }
    );
  }
}
