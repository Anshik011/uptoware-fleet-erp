import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { frappeFetch } from '@/lib/frappe';

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const doctype = formData.get('doctype') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Please provide a .xlsx or .csv spreadsheet.' },
        { status: 400 }
      );
    }

    if (!doctype) {
      return NextResponse.json(
        { success: false, error: 'No target DocType specified.' },
        { status: 400 }
      );
    }

    // Step 1: Forward the file to Frappe /api/method/upload_file
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('is_private', '0');
    uploadFormData.append('doctype', 'Data Import');

    const uploadRes = await fetch(`${FRAPPE_URL}/api/method/upload_file`, {
      method: 'POST',
      headers: {
        Cookie: `sid=${auth.sid}`,
        Referer: FRAPPE_URL,
      },
      body: uploadFormData,
    });

    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok || !uploadJson.message || !uploadJson.message.file_url) {
      const errMsg = uploadJson.message?.message || uploadJson.exception || 'Failed to upload file to ERPNext';
      return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }

    const fileUrl = uploadJson.message.file_url;

    // Step 2: Create native ERPNext 'Data Import' document
    const diRes = await frappeFetch<{ data: any }>('/api/resource/Data Import', {
      method: 'POST',
      sessionCookie: auth.sid,
      body: JSON.stringify({
        reference_doctype: doctype,
        import_type: 'Insert New Records',
        import_file: fileUrl,
        submit_after_import: 0,
      }),
    });

    const dataImportName = diRes.data.name;

    // Step 3: Trigger native ERPNext Import execution
    try {
      await frappeFetch('/api/method/frappe.core.doctype.data_import.data_import.form_start_import', {
        method: 'POST',
        sessionCookie: auth.sid,
        body: JSON.stringify({
          data_import: dataImportName,
        }),
      });
    } catch (startErr: any) {
      console.warn('form_start_import trigger notice:', startErr?.message);
    }

    return NextResponse.json({
      success: true,
      dataImportId: dataImportName,
      fileUrl,
      doctype,
      message: 'File successfully uploaded and import initiated in ERPNext.',
    });
  } catch (err: any) {
    console.error('Error in /api/import/upload:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error while processing file import' },
      { status: 500 }
    );
  }
}
