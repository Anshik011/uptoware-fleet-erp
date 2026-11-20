import { NextRequest, NextResponse } from 'next/server';
import { getPendingApprovals, executeApprovalAction } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { resolveUserMineScope, MineAuthorizationError } from '@/lib/mineAuth';
import { ApprovalDocType } from '@/types/fleet';

const VALID_DOCTYPES: ApprovalDocType[] = [
  'Mining Trip',
  'Fuel Log',
  'Vehicle Breakdown',
  'Operational Expense',
  'Purchase Order',
  'Vehicle Insurance Policy',
];

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'approvals', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view approvals.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const doctypeFilter = searchParams.get('doctype');

    const isAdmin =
      auth.user.role === 'Administrator' ||
      auth.user.roles.includes('System Manager') ||
      auth.user.roles.includes('Administrator');

    const requestedIncludeTest = searchParams.get('include_test') === 'true';
    const includeTest = isAdmin ? requestedIncludeTest : false;

    const { items, metrics } = await getPendingApprovals(
      auth.sid,
      {
        email: auth.user.email,
        role: auth.user.role,
        roles: auth.user.roles,
      },
      includeTest
    );

    let filteredItems = items;
    if (doctypeFilter && doctypeFilter !== 'ALL') {
      filteredItems = filteredItems.filter((i) => i.doctype === doctypeFilter);
    }

    return NextResponse.json({
      success: true,
      items: filteredItems,
      metrics,
      totalCount: filteredItems.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /approvals GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve pending approvals.' },
      { status: err?.status || 500 }
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

    if (!checkPermission(auth.user, 'approvals', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to execute approvals.' },
        { status: 403 }
      );
    }

    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload.' },
        { status: 400 }
      );
    }

    const { doctype, id, ids, action, rejectionReason, notes } = body;

    if (!doctype || !VALID_DOCTYPES.includes(doctype as ApprovalDocType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or missing doctype. Allowed doctypes: ${VALID_DOCTYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const targetIds: string[] = Array.isArray(ids) ? ids : (id && typeof id === 'string' ? [id] : []);
    if (targetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document ID or array of IDs parameter is required.' },
        { status: 400 }
      );
    }

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Approval action parameter is required.' },
        { status: 400 }
      );
    }

    // Role boundary checks for operational approval authority
    const role = auth.user.role;
    const isSuperAdmin =
      role === 'Administrator' ||
      auth.user.roles.includes('System Manager') ||
      auth.user.roles.includes('Administrator');

    if (!isSuperAdmin) {
      if (role === 'Accountant' && !['Operational Expense', 'Purchase Order', 'Vehicle Insurance Policy'].includes(doctype)) {
        return NextResponse.json(
          {
            success: false,
            error: `Accountant role is not authorized to approve ${doctype} records.`,
          },
          { status: 403 }
        );
      }
      if (role === 'Dispatcher' && !['Mining Trip'].includes(doctype)) {
        return NextResponse.json(
          {
            success: false,
            error: `Dispatcher role is not authorized to approve ${doctype} records.`,
          },
          { status: 403 }
        );
      }
      if (role === 'Workshop Supervisor' && !['Vehicle Breakdown', 'Fuel Log'].includes(doctype)) {
        return NextResponse.json(
          {
            success: false,
            error: `Workshop Supervisor role is not authorized to approve ${doctype} records.`,
          },
          { status: 403 }
        );
      }
    }

    // Mandatory rejection reason validation
    const trimmedAction = action.trim();
    if (trimmedAction === 'Reject' || trimmedAction === 'Cancel') {
      if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rejection reason is strictly mandatory when rejecting or cancelling a record.',
          },
          { status: 400 }
        );
      }
    }

    const mineScope = await resolveUserMineScope(request);
    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    let firstFailStatus = 500;

    for (const docId of targetIds) {
      try {
        const result = await executeApprovalAction(
          auth.sid,
          {
            email: auth.user.email,
            role: auth.user.role,
            roles: auth.user.roles,
            isAllMines: mineScope.isAllMines,
            allowedMines: mineScope.allowedMines,
          },
          {
            doctype: doctype as ApprovalDocType,
            id: docId,
            action: trimmedAction,
            rejectionReason: rejectionReason ? String(rejectionReason).trim() : undefined,
            notes: notes ? String(notes).trim() : undefined,
          }
        );
        results.push({ id: docId, success: true, result });
        successCount++;
      } catch (err: any) {
        failCount++;
        const errMsg = err?.message || 'Approval failed';
        let statusCode = err?.status || 500;
        if (/workflow action|not a valid workflow|already approved|already submitted|invalid state|cannot be transitioned/i.test(errMsg)) {
          statusCode = 409;
        } else if (/not found|does not exist/i.test(errMsg)) {
          statusCode = 404;
        } else if (/access denied|not authorized|forbidden|permission|mine site/i.test(errMsg)) {
          statusCode = 403;
        } else if (/mandatory|required|bad request/i.test(errMsg)) {
          statusCode = 400;
        }
        if (failCount === 1) {
          firstFailStatus = statusCode;
        }
        errors.push(`${docId}: ${errMsg}`);
        results.push({ id: docId, success: false, error: errMsg, status: statusCode });
      }
    }

    if (targetIds.length === 1) {
      if (failCount > 0) {
        return NextResponse.json(
          { success: false, error: errors[0] },
          { status: firstFailStatus }
        );
      }
      return NextResponse.json(results[0].result);
    }

    return NextResponse.json({
      success: failCount === 0,
      message: `Batch ${trimmedAction} completed: ${successCount} processed, ${failCount} failed.`,
      processedCount: targetIds.length,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (error: unknown) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    const err = error as { message?: string; status?: number };
    console.error('API /approvals POST error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to execute approval action.' },
      { status: err?.status || 500 }
    );
  }
}

