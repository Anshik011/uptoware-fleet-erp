import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, mapFrappeRolesToOperationalRole } from '@/lib/auth';

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';

// In-memory edge rate limiting state for local development and fast edge protection
interface LoginAttempt {
  failedCount: number;
  lockoutUntil: number;
  firstAttemptAt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000; // 60 seconds sliding window
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout

function getClientIdentifier(request: NextRequest, email: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  return `${ip}:${email.toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  let email = '';
  let password = '';

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request payload.' },
        { status: 400 }
      );
    }

    email = (body?.email || body?.usr || '').trim();
    password = (body?.password || body?.pwd || '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Operational email and password are required.' },
        { status: 400 }
      );
    }

    const clientId = getClientIdentifier(request, email);
    const now = Date.now();
    const attempt = loginAttempts.get(clientId);

    // 1. Edge-level lockout check
    if (attempt && attempt.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((attempt.lockoutUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(remainingSeconds),
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    // 2. Authenticate credentials against Frappe's official login endpoint
    const loginRes = await fetch(`${FRAPPE_URL}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usr: email, pwd: password }),
      cache: 'no-store',
    });

    if (!loginRes.ok) {
      const errJson = await loginRes.json().catch(() => ({}));
      const serverMsg = typeof errJson._server_messages === 'string' ? errJson._server_messages : '';
      const isBackendLocked =
        serverMsg.toLowerCase().includes('locked') ||
        serverMsg.toLowerCase().includes('securityexception') ||
        String(errJson.message || '').toLowerCase().includes('locked');

      // Record failed login attempt in edge tracker
      const currentAttempt = loginAttempts.get(clientId);
      if (!currentAttempt || now - currentAttempt.firstAttemptAt > ATTEMPT_WINDOW_MS) {
        loginAttempts.set(clientId, {
          failedCount: 1,
          lockoutUntil: 0,
          firstAttemptAt: now,
        });
      } else {
        currentAttempt.failedCount += 1;
        if (currentAttempt.failedCount >= MAX_FAILED_ATTEMPTS || isBackendLocked) {
          currentAttempt.lockoutUntil = now + LOCKOUT_DURATION_MS;
        }
      }

      // If backend Redis-backed lockout or edge lockout triggered
      if (isBackendLocked || (currentAttempt && currentAttempt.failedCount >= MAX_FAILED_ATTEMPTS)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many failed login attempts. Account temporarily locked for 60 seconds.',
          },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            },
          }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Invalid operational email or password.' },
        { status: 401 }
      );
    }

    // On successful authentication, reset login attempt tracker
    loginAttempts.delete(clientId);

    // Extract Frappe session cookie from response headers
    const setCookieHeader = loginRes.headers.get('set-cookie') || '';
    const sidMatch = setCookieHeader.match(/sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;

    if (!sid || sid === 'Guest') {
      return NextResponse.json(
        { success: false, error: 'Authentication succeeded but no valid session was generated.' },
        { status: 500 }
      );
    }

    // Fetch user details and assigned roles from Frappe using this session
    const profileRes = await fetch(`${FRAPPE_URL}/api/method/uptoware_get_current_user`, {
      headers: { Cookie: `sid=${sid}` },
      cache: 'no-store',
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve authenticated user profile.' },
        { status: 500 }
      );
    }

    const profileJson = await profileRes.json();
    const profile = profileJson.message;

    if (!profile || !profile.user || profile.user === 'Guest') {
      return NextResponse.json(
        { success: false, error: 'Authenticated session is invalid or has expired.' },
        { status: 401 }
      );
    }

    const roles: string[] = profile.roles || [];
    const primaryRole = mapFrappeRolesToOperationalRole(roles);

    const department =
      primaryRole === 'Accountant'
        ? 'Finance & Accounts'
        : primaryRole === 'Workshop Supervisor'
          ? 'Workshop & Fleet Maintenance'
          : primaryRole === 'Dispatcher'
            ? 'Dispatch & Weighbridge Operations'
            : 'Fleet Operations';

    const userPayload = {
      id: profile.user,
      name: profile.full_name || profile.user,
      email: profile.email || profile.user,
      roles,
      role: primaryRole,
      department,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: userPayload,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );

    // Set secure, HttpOnly session cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: sid,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Also set standard sid cookie for direct proxy compatibility
    response.cookies.set({
      name: 'sid',
      value: sid,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    // Log generic error message without any credentials or passwords
    console.error('Login error:', err?.message || 'Authentication error');
    return NextResponse.json(
      { success: false, error: 'Internal server error during authentication.' },
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
