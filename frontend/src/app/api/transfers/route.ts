import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { validateAndResolveMineFilter, assertMineAccess, MineAuthorizationError } from '@/lib/mineAuth';
import { getMineTransferLogs, createMineTransferLog } from '@/lib/frappe';
import { CreateMineTransferInput, MineTransferType } from '@/types/fleet';

const PERMITTED_ASSET_TYPES: MineTransferType[] = ['Vehicle', 'Driver'];

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'vehicles', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view transfer logs.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const transferType = searchParams.get('transfer_type') || searchParams.get('transferType') || undefined;
    const assetId = searchParams.get('asset_id') || searchParams.get('assetId') || undefined;
    const status = searchParams.get('status') || undefined;
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    let mineFilter;
    try {
      mineFilter = validateAndResolveMineFilter(auth.user, requestedMine);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    let transfers = await getMineTransferLogs(`sid=${auth.sid}`, {
      transferType,
      assetId,
      status,
      limit,
    });

    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      transfers = transfers.filter(
        (t) => t.fromMine === mineFilter.targetMine || t.toMine === mineFilter.targetMine
      );
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      transfers = transfers.filter(
        (t) =>
          mineFilter.targetMines!.includes(t.fromMine) ||
          mineFilter.targetMines!.includes(t.toMine)
      );
    }

    return NextResponse.json({
      success: true,
      count: transfers.length,
      data: transfers,
    });
  } catch (error: any) {
    console.error('API /transfers GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error fetching transfer logs.' },
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

    // Creating transfer logs requires manage permissions on vehicles
    if (!checkPermission(auth.user, 'vehicles', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to initiate asset transfers.' },
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

    const {
      transferType,
      assetId,
      toMine,
      effectiveDate,
      odometerAtTransfer,
      reason,
      remarks,
    } = body;

    if (!transferType || !PERMITTED_ASSET_TYPES.includes(transferType)) {
      return NextResponse.json(
        { success: false, error: `Asset type must be one of: ${PERMITTED_ASSET_TYPES.join(', ')}.` },
        { status: 400 }
      );
    }

    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required.' },
        { status: 400 }
      );
    }

    if (!toMine || typeof toMine !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Destination Mine Site is required.' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Transfer reason is required.' },
        { status: 400 }
      );
    }

    const input: CreateMineTransferInput = {
      transferType,
      assetId: assetId.trim(),
      toMine: toMine.trim(),
      effectiveDate: effectiveDate || undefined,
      odometerAtTransfer: odometerAtTransfer !== undefined ? Number(odometerAtTransfer) : undefined,
      reason: reason.trim(),
      remarks: remarks ? String(remarks).trim() : undefined,
    };

    const created = await createMineTransferLog(
      `sid=${auth.sid}`,
      input,
      auth.user.id || auth.user.name || 'Administrator'
    );

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: 'Fleet Mine Transfer Log created successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API /transfers POST error:', error);
    let errorMsg = error.message || 'Internal server error creating transfer log.';
    if (errorMsg.includes('ValidationError:')) {
      errorMsg = errorMsg.split('ValidationError:')[1].split('\n')[0].trim();
    }
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: error.status || 400 }
    );
  }
}
