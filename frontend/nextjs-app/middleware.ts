import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('crest_token')?.value;

  const { pathname } = request.nextUrl;

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
    '/dashboard', '/dashboard/:path*',
    '/queue', '/queue/:path*',
    '/analytics', '/analytics/:path*',
    '/complaints', '/complaints/:path*',
    '/login'
  ],
};
