import { NextRequest, NextResponse } from 'next/server';
import { executeFleetReport } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

const ALLOWED_FINANCE_REPORTS = [
  'Trip-wise Revenue and Profitability',
  'Vehicle-wise Revenue and Profitability',
  'Mine Site-wise Revenue and Profitability',
  'Customer-wise Revenue',
  'Monthly Revenue Summary',
  'Operating Cost Summary',
  'Vehicle Operating Cost Analysis',
  'Revenue vs Cost Analysis',
  'Outstanding Revenue / Receivables',
  'Unallocated Cost Register',
  'Accounts Receivable',
  'Gross Profit',
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

    if (!checkPermission(auth.user, 'financialReports', 'view') && !checkPermission(auth.user, 'finance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view financial reports.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json({
      success: true,
      allowedReports: ALLOWED_FINANCE_REPORTS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
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
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'financialReports', 'view') && !checkPermission(auth.user, 'finance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to execute financial reports.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const reportName = body.report_name;

    if (!reportName || !ALLOWED_FINANCE_REPORTS.includes(reportName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unauthorized report name: '${reportName}'. Must be one of the authorized finance reports.`,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
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
    console.error('Error executing finance report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while executing finance report' },
      { status: error.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET, POST' } });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET, POST' } });
}

