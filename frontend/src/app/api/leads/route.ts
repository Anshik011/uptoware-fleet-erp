import { NextRequest, NextResponse } from 'next/server';
import { getFleetLeads, createFleetLead } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import {
  resolveUserMineScope,
  validateAndResolveMineFilter,
  validateWriteMineSite,
  MineAuthorizationError,
} from '@/lib/mineAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, requestedMine || undefined);
    const targetMine = mineFilter.filterType === 'single' ? mineFilter.targetMine : undefined;

    let leads = await getFleetLeads(auth.sid, targetMine);

    if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      leads = leads.filter((l) => mineFilter.targetMines!.includes(l.mineSite));
    }

    return NextResponse.json(
      {
        success: true,
        data: leads,
        count: leads.length,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('API /leads GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch haulage leads.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'trips', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to create haulage leads.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.leadName || !body.mineSite || body.leadKm == null || body.leadRate == null) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory fields: leadName, mineSite, leadKm, leadRate.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const mineScope = await resolveUserMineScope(request);
    validateWriteMineSite(mineScope, body.mineSite);

    const lead = await createFleetLead(auth.sid, {
      leadName: body.leadName,
      mineSite: body.mineSite,
      leadKm: body.leadKm,
      leadRate: Number(body.leadRate),
      validFrom: body.validFrom,
      validTo: body.validTo,
      description: body.description,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Fleet Lead created successfully.',
        data: lead,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('API /leads POST error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create haulage lead.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
