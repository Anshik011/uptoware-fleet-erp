import { NextRequest, NextResponse } from 'next/server';
import { executeFleetReport } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { resolveUserMineScope, MineAuthorizationError } from '@/lib/mineAuth';

const ALLOWED_REPORTS = [
  'Spare Parts Stock Register',
  'Warehouse-wise Stock',
  'Low Stock / Reorder Report',
  'Spare Parts Consumption by Vehicle',
  'Spare Parts Consumption by Breakdown',
  'Spare Parts Consumption by Mine Site',
  'Stock Movement History',
  'Supplier Register',
  'Supplier-wise Purchase Summary',
  'Purchase Order Register',
  'Pending Purchase Orders',
  'Purchase Receipt Register',
  'Purchase Invoice Register',
  'Supplier Outstanding / Payables',
  'Purchase by Vehicle / Breakdown / Mine Site',
  'Purchase Analysis by Month',
];

const COMPANY_GLOBAL_REPORTS = [
  'Supplier Register',
];

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'procurement', 'view') && !checkPermission(auth.user, 'spareParts', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view reports.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, allowedReports: ALLOWED_REPORTS },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'procurement', 'view') && !checkPermission(auth.user, 'spareParts', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view reports.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const reportName = body.report_name;

    if (!reportName || !ALLOWED_REPORTS.includes(reportName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unauthorized report name: '${reportName}'. Must be one of the 16 fleet reports.`,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const mineScope = await resolveUserMineScope(request);
    const filters = body.filters || {};

    if (!COMPANY_GLOBAL_REPORTS.includes(reportName) && !mineScope.isAllMines) {
      if (mineScope.isUnassigned) {
        return NextResponse.json(
          { success: false, error: 'Access Denied: Operational user has no assigned mine sites (Default-Deny).' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      const requestedMine = filters.mine_site;
      if (requestedMine && !mineScope.allowedMines.includes(requestedMine)) {
        return NextResponse.json(
          { success: false, error: `Access Denied: You are not authorized for Mine Site '${requestedMine}'.` },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      if (!requestedMine) {
        filters.mine_site = mineScope.allowedMines[0];
      }
    }

    const reportData = await executeFleetReport(auth.sid, reportName, filters);

    return NextResponse.json({
      success: true,
      reportName,
      columns: reportData.columns,
      result: reportData.result,
      rowCount: reportData.result.length,
    });
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('Error executing report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while executing fleet report' },
      { status: error.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
