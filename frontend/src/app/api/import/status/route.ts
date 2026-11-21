import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { frappeFetch } from '@/lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataImportId = searchParams.get('id');

    if (!dataImportId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // 1. Fetch Data Import Doc to get general state
    const docRes = await frappeFetch<{ data: any }>(`/api/resource/Data Import/${encodeURIComponent(dataImportId)}`, {
      method: 'GET',
      sessionCookie: auth.sid,
    });

    const doc = docRes.data || {};

    // 2. Fetch Detailed Import Status
    let importStatus: any = {};
    try {
      const statusRes = await frappeFetch<any>(
        `/api/method/frappe.core.doctype.data_import.data_import.get_import_status?data_import_name=${encodeURIComponent(dataImportId)}`,
        {
          method: 'GET',
          sessionCookie: auth.sid,
        }
      );
      importStatus = statusRes.message || statusRes || {};
    } catch (e: any) {
      console.warn('get_import_status error:', e?.message);
    }

    // 3. Fetch Row-by-Row Import Logs
    let importLogs: any[] = [];
    try {
      const logsRes = await frappeFetch<any>(
        `/api/method/frappe.core.doctype.data_import.data_import.get_import_logs?data_import=${encodeURIComponent(dataImportId)}`,
        {
          method: 'GET',
          sessionCookie: auth.sid,
        }
      );
      if (Array.isArray(logsRes.message)) {
        importLogs = logsRes.message;
      } else if (Array.isArray(logsRes)) {
        importLogs = logsRes;
      }
    } catch (e: any) {
      console.warn('get_import_logs error:', e?.message);
    }

    return NextResponse.json({
      success: true,
      dataImportId,
      status: doc.status || 'Pending',
      referenceDoctype: doc.reference_doctype,
      payloadCount: doc.payload_count || importStatus.total_records || 0,
      successCount: importStatus.success_records || importLogs.filter((l) => l.success).length,
      failedCount: importStatus.failed_records || importLogs.filter((l) => !l.success).length,
      logs: importLogs.map((log: any) => ({
        rowNumber: log.row_indexes ? JSON.parse(log.row_indexes)[0] : log.row_number,
        success: Boolean(log.success),
        docName: log.docname,
        messages: log.messages ? (typeof log.messages === 'string' ? JSON.parse(log.messages) : log.messages) : [],
        exception: log.exception,
      })),
    });
  } catch (err: any) {
    console.error('Error in /api/import/status:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error while checking import status' },
      { status: 500 }
    );
  }
}
