import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'uptoware_sid';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Static assets and internal resources are public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/branding') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Comprehensive CSRF & Cross-Origin Request Defense for state-changing HTTP methods
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isStateChanging && pathname.startsWith('/api/')) {
    // A. Check Sec-Fetch-Site (modern browser metadata)
    const secFetchSite = request.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-site request rejected (CSRF protection).' },
        { status: 403 }
      );
    }

    // B. Check Sec-Fetch-Mode (reject browser top-level form navigations directly to API mutations)
    const secFetchMode = request.headers.get('sec-fetch-mode');
    if (secFetchMode === 'navigate') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Navigation request to API rejected (CSRF protection).' },
        { status: 403 }
      );
    }

    // C. Strict Origin and Referer verification against trusted host
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host') || request.nextUrl.host;
    const trustedHosts = [host, 'localhost:3001', '127.0.0.1:3001'];

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (!trustedHosts.includes(originUrl.host)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Request origin mismatch (CSRF protection).' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Malformed request origin.' },
          { status: 403 }
        );
      }
    } else if (referer) {
      // If Origin header is absent (e.g. certain proxy or browser configurations), verify Referer
      try {
        const refererUrl = new URL(referer);
        if (!trustedHosts.includes(refererUrl.host)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Referer origin mismatch (CSRF protection).' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Malformed request referer.' },
          { status: 403 }
        );
      }
    } else {
      // If both Origin and Referer are missing on a browser mutation request
      const contentType = request.headers.get('content-type') || '';
      const isSimpleForm =
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data') ||
        contentType.includes('text/plain');

      // Block unauthenticated/cross-origin browser form posts that omit origin/referer
      if (isSimpleForm && (secFetchSite || secFetchMode)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Browser form submissions without Origin header rejected.' },
          { status: 403 }
        );
      }
    }
  }

  const hasSessionCookie =
    request.cookies.has(AUTH_COOKIE_NAME) || request.cookies.has('sid');

  // 3. Handle /login page access
  if (pathname === '/login') {
    if (hasSessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 4. Allow public /api/auth endpoints to manage their own auth responses
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 5. Protect all other pages and API routes
  if (!hasSessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
