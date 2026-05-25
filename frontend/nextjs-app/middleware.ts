import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('crest_token')?.value;

  const { pathname } = request.nextUrl;

  if (pathname === '/ub_CREST') {
    return NextResponse.redirect(new URL(token ? '/ub_CREST/home' : '/ub_CREST/login', request.url));
  }

  if (pathname === '/ub_crest' || pathname.startsWith('/ub_crest/')) {
    const correctedPath = pathname.replace('/ub_crest', '/ub_CREST');
    return NextResponse.redirect(new URL(`${correctedPath}${request.nextUrl.search}`, request.url));
  }

  // 1. If trying to access administrative routes without a token, redirect to login
  const protectedRoutes = [
    '/dashboard', '/queue', '/analytics', '/complaints',
    '/ub_CREST/home', '/ub_CREST/queue', '/ub_CREST/analytics', '/ub_CREST/management'
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/ub_CREST/login', request.url));
  }

  // 2. If already logged in and trying to access the login page, redirect to home
  if (pathname === '/ub_CREST/login' && token) {
    return NextResponse.redirect(new URL('/ub_CREST/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/ub_CREST',
    '/ub_crest', '/ub_crest/:path*',
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
