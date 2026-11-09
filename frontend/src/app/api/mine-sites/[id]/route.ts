import { NextRequest, NextResponse } from 'next/server';
import { getMineSiteDetails, updateMineSite, getCustomers } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { UpdateMineSiteInput, MineSiteStatus, MineralType } from '@/types/fleet';

const PERMITTED_STATUSES: MineSiteStatus[] = ['Operational', 'Inactive'];
const PERMITTED_MINERALS: MineralType[] = [
  'Iron Ore',
  'Coal',
  'Bauxite',
  'Limestone',
  'Manganese',
  'Overburden',
  'Other',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    if (!checkPermission(auth.user, 'mineSites', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid mine site identifier.' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includeTest = searchParams.get('include_test') === 'true';

    const details = await getMineSiteDetails(auth.sid, id, includeTest);
    if (!details || !details.site) {
      return NextResponse.json(
        { success: false, error: `Mine site '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: details },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /mine-sites/[id] GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch mine site details.' },
      { status }
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
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'mineSites', 'manage')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Insufficient permissions to update mine site records.',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid mine site identifier.' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid update payload.' },
        { status: 400 }
      );
    }

    const updatePayload: UpdateMineSiteInput = {};

    if (body.status !== undefined) {
      if (!PERMITTED_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status. Must be one of: ${PERMITTED_STATUSES.join(', ')}.`,
          },
          { status: 400 }
        );
      }
      updatePayload.status = body.status;
    }

    if (body.mineralType !== undefined) {
      if (!PERMITTED_MINERALS.includes(body.mineralType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid mineral type. Must be one of: ${PERMITTED_MINERALS.join(', ')}.`,
          },
          { status: 400 }
        );
      }
      updatePayload.mineralType = body.mineralType;
    }

    if (body.dailyTargetTonnage !== undefined) {
      const tonnage = Number(body.dailyTargetTonnage);
      if (isNaN(tonnage) || tonnage < 0 || tonnage > 1000000) {
        return NextResponse.json(
          {
            success: false,
            error: 'Daily target tonnage must be a non-negative number up to 1,000,000.',
          },
          { status: 400 }
        );
      }
      updatePayload.dailyTargetTonnage = tonnage;
    }

    if (body.activeLoadingPits !== undefined) {
      const pits = Number(body.activeLoadingPits);
      if (isNaN(pits) || !Number.isInteger(pits) || pits < 1 || pits > 100) {
        return NextResponse.json(
          {
            success: false,
            error: 'Active loading pits must be an integer between 1 and 100.',
          },
          { status: 400 }
        );
      }
      updatePayload.activeLoadingPits = pits;
    }

    if (body.ratePerTon !== undefined) {
      const rate = Number(body.ratePerTon);
      if (isNaN(rate) || rate < 0 || rate > 100000) {
        return NextResponse.json(
          {
            success: false,
            error: 'Indicative rate per ton must be a non-negative number up to 100,000.',
          },
          { status: 400 }
        );
      }
      updatePayload.ratePerTon = rate;
    }

    if (body.location !== undefined) {
      const loc = (body.location || '').trim();
      if (loc && loc.length > 500) {
        return NextResponse.json(
          {
            success: false,
            error: 'Location details must not exceed 500 characters.',
          },
          { status: 400 }
        );
      }
      updatePayload.location = loc || undefined;
    }

    if (body.client !== undefined) {
      const c = (body.client || '').trim();
      if (c) {
        const genuineCustomers = await getCustomers(auth.sid, false);
        const isGenuine = genuineCustomers.some((cust) => cust.id === c);
        if (!isGenuine) {
          return NextResponse.json(
            {
              success: false,
              error: 'Test customers cannot be associated with genuine operational mine sites.',
            },
            { status: 400 }
          );
        }
      }
      updatePayload.client = c || undefined;
    }

    const updated = await updateMineSite(auth.sid, id, updatePayload);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API /mine-sites/[id] PATCH error:', error?.message || 'Error');
    const status = error.status || 500;
    const cleanError =
      error.status === 404
        ? 'Mine site not found.'
        : error.status === 403
          ? 'Forbidden: Insufficient permissions to update mine site.'
          : error?.message || 'Failed to update mine site record.';
    return NextResponse.json({ success: false, error: cleanError }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Operational mine site record deletion is prohibited.' },
    { status: 403, headers: { Allow: 'GET, PATCH, PUT' } }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, PATCH, PUT' } }
  );
}

