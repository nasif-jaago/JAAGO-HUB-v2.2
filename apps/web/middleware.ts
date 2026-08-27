import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that do NOT require authentication
 */
const PUBLIC_PATHS = [
  '/login',
  '/sign-in',
  '/reset-password',
  '/auth/callback',
  '/health',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Check if the path is a public route or static asset
  const isPublicRoute =
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith('/api/v1/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.'); // Static files (.png, .jpg, .ico, .svg, .webp, etc.)

  // 2. Check for session tokens in request cookies
  const hasAccessToken = request.cookies.has('jaago_access_token');
  const hasUserCookie = request.cookies.has('jaago_user');
  const hasSupabaseCookie = Array.from(request.cookies.getAll()).some(
    (c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'supabase-auth-token'
  );

  const isAuthenticated = hasAccessToken || hasUserCookie || hasSupabaseCookie;

  // Root path routing
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ── 3. STRICT ERP AUTHENTICATION ENFORCEMENT ──
  // If accessing a protected route without authentication, immediately redirect to /login
  if (!isPublicRoute && !isAuthenticated) {
    const redirectUrl = new URL('/login', request.url);
    const destination = pathname + search;
    if (destination !== '/' && destination !== '/dashboard') {
      redirectUrl.searchParams.set('redirect', destination);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If already authenticated and trying to access /login or /sign-in, redirect to /dashboard
  if ((pathname === '/login' || pathname === '/sign-in') && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. Continue with request and apply Enterprise Security Headers
  const response = NextResponse.next();

  // Content Security Policy (CSP)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: https://storage.jaago.com.bd https://*.supabase.co https://*.googleusercontent.com;
    connect-src 'self' https://storage.jaago.com.bd https://*.supabase.co https://*.googleapis.com;
    frame-ancestors 'none';
    form-action 'self' https://*.supabase.co https://accounts.google.com;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

