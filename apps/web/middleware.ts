import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public web page routes that do NOT require authentication
 */
const PUBLIC_PATHS = [
  '/login',
  '/sign-in',
  '/reset-password',
  '/auth/callback',
  '/health',
];

/**
 * Public API routes that do NOT require user session
 */
const PUBLIC_API_PATHS = [
  '/api/v1/auth/sign-in',
  '/api/v1/auth/login',
  '/api/v1/auth/forgot-password',
  '/api/v1/biotime/push',
  '/health',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Static assets and Next.js internal files
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico';

  if (isStaticAsset) {
    return NextResponse.next();
  }

  // 2. Check for session tokens in request cookies or Authorization header (Dual-Channel Auth)
  const hasAccessToken = request.cookies.has('jaago_access_token');
  const hasUserCookie = request.cookies.has('jaago_user');
  const hasSupabaseCookie = Array.from(request.cookies.getAll()).some(
    (c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'supabase-auth-token'
  );
  const authHeader = request.headers.get('authorization');
  const hasBearerToken = Boolean(authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 10);

  const isAuthenticated = hasAccessToken || hasUserCookie || hasSupabaseCookie || hasBearerToken;

  // 3. API ROUTE GATEWAY SECURITY
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    if (!isPublicApi && !isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication token or active session is required to access this resource.',
        },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // 4. WEB PAGE ROUTING & AUTHENTICATION
  const isPublicPage = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // Root path routing
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If accessing a protected route without authentication, immediately redirect to /login
  if (!isPublicPage && !isAuthenticated) {
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

  // 5. Continue with request and apply Enterprise Security Headers
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

