import { NextRequest, NextResponse } from 'next/server';
import { executeFleetReport } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { resolveUserMineScope, MineAuthorizationError } from '@/lib/mineAuth';

const ALLOWED_COMPLIANCE_REPORTS = [
  'Vehicle Insurance Register',
  'Insurance Expiry Report',
  'Vehicle Document Expiry Report',
  'Upcoming Renewals',
  'Expired Insurance & Documents',
  'Insurance Premium by Vehicle',
  'Insurance Renewal History',
];

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'insurance', 'view') && !checkPermission(auth.user, 'compliance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions for compliance reports.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const reportName = body.report_name;

    if (!reportName || !ALLOWED_COMPLIANCE_REPORTS.includes(reportName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid report name. Must be one of: ${ALLOWED_COMPLIANCE_REPORTS.join(', ')}`,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const mineScope = await resolveUserMineScope(request);
    const filters = body.filters || {};

    if (!mineScope.isAllMines) {
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

    const reportResult = await executeFleetReport(auth.sid, reportName, filters);

    return NextResponse.json({
      success: true,
      reportName,
      columns: reportResult.columns,
      result: reportResult.result,
      totalRows: reportResult.result.length,
    });
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('Error executing compliance report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while executing report' },
      { status: error.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: true, allowedReports: ALLOWED_COMPLIANCE_REPORTS },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
