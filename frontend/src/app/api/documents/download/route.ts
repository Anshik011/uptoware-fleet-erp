import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required to access documents.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    if (!checkPermission(auth.user, 'documents', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view documents.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileParam = searchParams.get('file') || searchParams.get('path');

    if (!fileParam || typeof fileParam !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bad Request: "file" query parameter is required.' },
        { status: 400 }
      );
    }

    // Security validation: Prevent path traversal and enforce sanctioned file paths
    const decodedFile = decodeURIComponent(fileParam).trim();
    if (
      decodedFile.includes('..') ||
      decodedFile.includes('\0') ||
      !(decodedFile.startsWith('/private/files/') || decodedFile.startsWith('/files/'))
    ) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: Invalid or unauthorized file path.' },
        { status: 400 }
      );
    }

    // Proxy the request securely to Frappe backend using the user's authenticated session
    const frappeFileUrl = `${FRAPPE_URL}${decodedFile}`;
    const frappeRes = await fetch(frappeFileUrl, {
      method: 'GET',
      headers: {
        Cookie: `sid=${auth.sid}`,
      },
      cache: 'no-store',
    });

    if (!frappeRes.ok) {
      return NextResponse.json(
        { success: false, error: `Document unavailable or access denied (Status: ${frappeRes.status}).` },
        { status: frappeRes.status }
      );
    }

    const contentType = frappeRes.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = frappeRes.headers.get('content-disposition') || 'inline';
    const fileBuffer = await frappeRes.arrayBuffer();

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('API /documents/download GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error downloading document.' },
      { status: 500 }
    );
  }
}

