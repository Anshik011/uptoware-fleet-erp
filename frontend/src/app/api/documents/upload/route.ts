import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpeg', '.jpg', '.png']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'documents', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to upload documents.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: No file provided or invalid file format.' },
        { status: 400 }
      );
    }

    const fileName = (file as any).name || 'document';
    const fileSize = file.size;
    const fileType = file.type || '';

    // Extension validation
    const extMatch = fileName.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file extension '${ext}'. Allowed types: PDF, JPG, JPEG, PNG.`,
        },
        { status: 400 }
      );
    }

    // MIME type validation
    if (fileType && !ALLOWED_MIME_TYPES.has(fileType.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported MIME type '${fileType}'. Allowed types: PDF, JPG, JPEG, PNG.`,
        },
        { status: 400 }
      );
    }

    // Size validation
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 10MB limit (size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB).`,
        },
        { status: 400 }
      );
    }

    // Forward to Frappe upload_file endpoint with user session as PRIVATE protected file
    const frappeFormData = new FormData();
    frappeFormData.append('is_private', '1');
    frappeFormData.append('file', file, fileName);

    const frappeBaseUrl = process.env.FRAPPE_URL || 'http://localhost:8080';
    const frappeRes = await fetch(`${frappeBaseUrl}/api/method/upload_file`, {
      method: 'POST',
      headers: {
        Cookie: `sid=${auth.sid}`,
      },
      body: frappeFormData,
    });

    const frappeJson = await frappeRes.json();

    if (!frappeRes.ok || frappeJson.exc || frappeJson.exception) {
      const errorMsg =
        frappeJson.message ||
        frappeJson.exception ||
        frappeJson._server_messages ||
        'Failed to upload file to backend storage.';
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: frappeRes.status >= 400 ? frappeRes.status : 500 }
      );
    }

    const uploadedDoc = frappeJson.message;
    return NextResponse.json({
      success: true,
      data: {
        fileId: uploadedDoc.name,
        fileName: uploadedDoc.file_name,
        fileUrl: uploadedDoc.file_url,
        fileSize: uploadedDoc.file_size,
        fileType: uploadedDoc.file_type || ext.replace('.', '').toUpperCase(),
      },
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during document upload.' },
      { status: 500 }
    );
  }
}

