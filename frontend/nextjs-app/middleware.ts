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

  // 1. If trying to access dashboard/queue/analytics without a token, redirect to login
  const protectedRoutes = ['/dashboard', '/queue', '/analytics', '/complaints'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If already logged in and trying to access login page, redirect to dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
    '/login'
  ],
};
