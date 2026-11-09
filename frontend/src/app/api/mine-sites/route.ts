import { NextRequest, NextResponse } from 'next/server';
import { getMineSites, createMineSite, getCustomers } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { CreateMineSiteInput, MineSiteStatus, MineralType } from '@/types/fleet';

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

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const status = searchParams.get('status') || 'ALL';
    const mineral = searchParams.get('mineral') || 'ALL';
    const includeTest = searchParams.get('include_test') === 'true';

    if (status !== 'ALL' && !PERMITTED_STATUSES.includes(status as MineSiteStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mine site status filter parameter.' },
        { status: 400 }
      );
    }

    if (mineral !== 'ALL' && !PERMITTED_MINERALS.includes(mineral as MineralType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mineral filter parameter.' },
        { status: 400 }
      );
    }

    let sites = await getMineSites(auth.sid, includeTest);

    if (query) {
      sites = sites.filter(
        (s) =>
          s.siteName.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          (s.location && s.location.toLowerCase().includes(query)) ||
          (s.client && s.client.toLowerCase().includes(query)) ||
          (s.clientName && s.clientName.toLowerCase().includes(query)) ||
          s.mineralType.toLowerCase().includes(query)
      );
    }

    if (status !== 'ALL') {
      sites = sites.filter((s) => s.status === status);
    }

    if (mineral !== 'ALL') {
      sites = sites.filter((s) => s.mineralType === mineral);
    }

    return NextResponse.json(
      { success: true, count: sites.length, data: sites },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /mine-sites GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch mine sites.' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const secFetchMode = request.headers.get('sec-fetch-mode');
    if (secFetchMode === 'navigate') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-site navigation disallowed.' },
        { status: 403 }
      );
    }

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
          error: 'Forbidden: Insufficient permissions to create mine site records.',
        },
        { status: 403 }
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
        { success: false, error: 'Invalid request payload.' },
        { status: 400 }
      );
    }

    const siteName = (body.siteName || '').trim();
    if (!siteName || siteName.length < 2 || siteName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site name is required and must be between 2 and 100 characters.',
        },
        { status: 400 }
      );
    }

    const status: MineSiteStatus = body.status || 'Operational';
    if (!PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${PERMITTED_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const mineralType: MineralType = body.mineralType || 'Iron Ore';
    if (!PERMITTED_MINERALS.includes(mineralType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid mineral type. Must be one of: ${PERMITTED_MINERALS.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const dailyTargetTonnage = Number(body.dailyTargetTonnage ?? 0);
    if (isNaN(dailyTargetTonnage) || dailyTargetTonnage < 0 || dailyTargetTonnage > 1000000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily target tonnage must be a non-negative number up to 1,000,000.',
        },
        { status: 400 }
      );
    }

    const activeLoadingPits = Number(body.activeLoadingPits ?? 1);
    if (
      isNaN(activeLoadingPits) ||
      !Number.isInteger(activeLoadingPits) ||
      activeLoadingPits < 1 ||
      activeLoadingPits > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Active loading pits must be an integer between 1 and 100.',
        },
        { status: 400 }
      );
    }

    const ratePerTon = Number(body.ratePerTon ?? 0);
    if (isNaN(ratePerTon) || ratePerTon < 0 || ratePerTon > 100000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Indicative rate per ton must be a non-negative number up to 100,000.',
        },
        { status: 400 }
      );
    }

    const location = (body.location || '').trim();
    if (location && location.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location details must not exceed 500 characters.',
        },
        { status: 400 }
      );
    }

    const client = (body.client || '').trim();
    if (client) {
      const genuineCustomers = await getCustomers(auth.sid, false);
      const isGenuine = genuineCustomers.some((c) => c.id === client);
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

    const input: CreateMineSiteInput = {
      siteName,
      client: client || undefined,
      status,
      mineralType,
      dailyTargetTonnage,
      activeLoadingPits,
      location: location || undefined,
      ratePerTon,
    };

    const newSite = await createMineSite(auth.sid, input);
    return NextResponse.json({ success: true, data: newSite }, { status: 201 });
  } catch (error: any) {
    console.error('API /mine-sites POST error:', error?.message || 'Error');
    const isConflict =
      error.status === 409 ||
      error.message?.includes('Duplicate') ||
      error.message?.includes('already exists');
    if (isConflict) {
      return NextResponse.json(
        {
          success: false,
          error: 'A mine site with this name already exists in the system.',
        },
        { status: 409 }
      );
    }
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create mine site.' },
      { status }
    );
  }
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

