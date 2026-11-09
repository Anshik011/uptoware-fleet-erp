import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (!auth) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthenticated' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );

      // Expire invalid cookie
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
    }

    return NextResponse.json(
      {
        success: true,
        user: auth.user,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    console.error('Session verification error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: 'Internal session error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
