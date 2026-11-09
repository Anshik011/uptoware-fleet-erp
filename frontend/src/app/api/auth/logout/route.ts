import { NextRequest, NextResponse } from 'next/server';
import { extractSidFromRequest, AUTH_COOKIE_NAME } from '@/lib/auth';

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const sid = extractSidFromRequest(request);

    if (sid) {
      // Invalidate session on Frappe server
      await fetch(`${FRAPPE_URL}/api/method/logout`, {
        method: 'POST',
        headers: { Cookie: `sid=${sid}` },
        cache: 'no-store',
      }).catch((err) => {
        console.warn('Frappe backend logout call warning:', err?.message || 'Warning');
      });
    }

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );

    // Clear session cookies on client
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: '',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set({
      name: 'sid',
      value: '',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Logout error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: 'Failed to complete logout' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
