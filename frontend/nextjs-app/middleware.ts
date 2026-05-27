import { NextResponse, NextRequest } from 'next/server';

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') {
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    }
  } catch (e) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('crest_token')?.value;

  const { pathname } = request.nextUrl;
  const isRecovered = request.nextUrl.searchParams.get("recovered") === "1";
  
  const isExpired = token ? isJwtExpired(token) : false;
  const hasValidToken = token && !isExpired;

  if (pathname === '/ub_CREST') {
    return NextResponse.redirect(new URL(hasValidToken ? '/ub_CREST/home' : '/ub_CREST/login', request.url));
  }

  if (pathname === '/ub_crest' || pathname.startsWith('/ub_crest/')) {
    const correctedPath = pathname.replace('/ub_crest', '/ub_CREST');
    return NextResponse.redirect(new URL(`${correctedPath}${request.nextUrl.search}`, request.url));
  }

  // Common typo: /ub_crrest → /ub_CREST
  if (pathname === '/ub_crrest' || pathname.startsWith('/ub_crrest/')) {
    const correctedPath = pathname.replace('/ub_crrest', '/ub_CREST');
    return NextResponse.redirect(new URL(`${correctedPath}${request.nextUrl.search}`, request.url));
  }

  // 1. If trying to access administrative routes without a token, redirect to login
  const protectedRoutes = [
    '/dashboard', '/queue', '/analytics', '/complaints',
    '/ub_CREST/home', '/ub_CREST/queue', '/ub_CREST/analytics', '/ub_CREST/management'
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !hasValidToken) {
    const response = NextResponse.redirect(new URL('/ub_CREST/login?recovered=1', request.url));
    if (token) {
      response.cookies.set('crest_token', '', {
        path: '/',
        expires: new Date(0),
        sameSite: 'lax',
        secure: true,
      });
    }
    return response;
  }

  // If we explicitly arrived here to recover from an invalid session, expire the stale token first.
  if (pathname === '/ub_CREST/login' && token && (isRecovered || isExpired)) {
    const response = NextResponse.next();
    response.cookies.set('crest_token', '', {
      path: '/',
      expires: new Date(0),
      sameSite: 'lax',
      secure: true,
    });
    return response;
  }

  // 2. If already logged in and trying to access the login page, redirect to home
  if (pathname === '/ub_CREST/login' && hasValidToken) {
    return NextResponse.redirect(new URL('/ub_CREST/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/ub_CREST',
    '/ub_crest', '/ub_crest/:path*',
    '/ub_crrest', '/ub_crrest/:path*',
    '/dashboard', '/dashboard/:path*',
    '/queue', '/queue/:path*',
    '/analytics', '/analytics/:path*',
    '/complaints', '/complaints/:path*',
    '/ub_CREST/login',
    '/ub_CREST/home',
    '/ub_CREST/queue',
    '/ub_CREST/analytics',
    '/ub_CREST/management'
  ],
};
