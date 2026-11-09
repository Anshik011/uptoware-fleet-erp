import { NextRequest, NextResponse } from 'next/server';
import { getFleetAlerts, updateFleetAlert, markAllFleetAlertsRead } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'alerts', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view alerts.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const status = searchParams.get('status') || undefined;
    const vehicle = searchParams.get('vehicle') || undefined;
    const fromDate = searchParams.get('from_date') || undefined;
    const toDate = searchParams.get('to_date') || undefined;
    const query = searchParams.get('q') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const countOnly = searchParams.get('count_only') === '1' || searchParams.get('count_only') === 'true';

    // Strict test isolation policy: only Administrator/System Manager can view test records
    const isAdmin =
      auth.user.role === 'Administrator' ||
      auth.user.roles.includes('System Manager') ||
      auth.user.roles.includes('Administrator');

    const requestedIncludeTest = searchParams.get('include_test') === 'true';
    const includeTest = isAdmin ? requestedIncludeTest : false;

    const { alerts, metrics, totalCount } = await getFleetAlerts(auth.sid, {
      category,
      severity,
      status,
      vehicle,
      fromDate,
      toDate,
      query,
      limit,
      offset,
      includeTest,
      countOnly,
    });

    if (countOnly) {
      return NextResponse.json({
        success: true,
        unreadCount: metrics.unreadAlerts,
        totalCount,
      });
    }

    return NextResponse.json({
      success: true,
      alerts,
      metrics,
      totalCount,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /alerts GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve fleet alerts.' },
      { status: err?.status || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'alerts', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to update alerts.' },
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

    if (body.mark_all_read || body.markAllRead) {
      const result = await markAllFleetAlertsRead(auth.sid, auth.user.email, auth.user.role);
      return NextResponse.json({
        success: true,
        message: `Successfully marked ${result.count} alerts as Read.`,
        count: result.count,
      });
    }

    const { id, status, resolution_note, resolutionNote } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Mandatory alert ID parameter missing.' },
        { status: 400 }
      );
    }

    const validStatuses = ['Unread', 'Read', 'Acknowledged', 'Resolved'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status '${status}'. Permitted: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const note = resolution_note || resolutionNote;
    const updated = await updateFleetAlert(auth.sid, id, {
      status,
      resolutionNote: note,
      resolvedBy: auth.user.email,
    });

    return NextResponse.json({
      success: true,
      message: `Alert '${id}' updated to status '${updated.status}'.`,
      alert: updated,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /alerts PATCH error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update alert status.' },
      { status: err?.status || 500 }
    );
  }
}

