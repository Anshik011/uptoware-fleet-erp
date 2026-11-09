import { NextRequest, NextResponse } from 'next/server';
import { executeFleetReport } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

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
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'insurance', 'view') && !checkPermission(auth.user, 'compliance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions for compliance reports.' },
        { status: 403 }
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
        { status: 400 }
      );
    }

    const reportResult = await executeFleetReport(auth.sid, reportName, body.filters || {});

    return NextResponse.json({
      success: true,
      reportName,
      columns: reportResult.columns,
      result: reportResult.result,
      totalRows: reportResult.result.length,
    });
  } catch (error: any) {
    console.error('Error executing compliance report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while executing report' },
      { status: error.status || 500 }
    );
  }
}

