import { NextRequest, NextResponse } from 'next/server';
import { executeFleetReport } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'procurement', 'view') && !checkPermission(auth.user, 'spareParts', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view reports.' },
        { status: 403 }
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
        { status: 400 }
      );
    }

    const filters = body.filters || {};
    const reportData = await executeFleetReport(auth.sid, reportName, filters);

    return NextResponse.json({
      success: true,
      reportName,
      columns: reportData.columns,
      result: reportData.result,
      rowCount: reportData.result.length,
    });
  } catch (error: any) {
    console.error('Error executing report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while executing fleet report' },
      { status: error.status || 500 }
    );
  }
}

