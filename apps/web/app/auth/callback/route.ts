import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnonClient, isAllowedWorkDomain } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    logger.warn('AUTH', 'oauth.callback.error', { metadata: { error, errorDescription } });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (code) {
    try {
      const supabase = getSupabaseAnonClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !data.session || !data.user) {
        logger.error('AUTH', 'oauth.exchange.failed', {
          metadata: { error: exchangeError?.message },
        });
        return NextResponse.redirect(
          new URL('/login?error=Authentication%20failed', requestUrl.origin)
        );
      }

      const email = data.user.email || '';

      // Strict domain restriction check
      if (!isAllowedWorkDomain(email)) {
        logger.warn('SECURITY', 'oauth.domain_restricted', { metadata: { email } });
        // Sign out unauthorized user from Supabase session
        await supabase.auth.signOut();

        return NextResponse.redirect(
          new URL(
            `/login?error=domain_restricted&rejectedEmail=${encodeURIComponent(email)}`,
            requestUrl.origin
          )
        );
      }

      logger.info('AUTH', 'oauth.login.success', {
        userId: data.user.id,
        metadata: { email, provider: 'google' },
      });

      const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin));

      // Store auth session cookie
      response.cookies.set('jaago_access_token', data.session.access_token, {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: data.session.expires_in,
        sameSite: 'lax',
      });

      return response;
    } catch (err: any) {
      logger.error('AUTH', 'oauth.callback.exception', { metadata: { err: err.message } });
      return NextResponse.redirect(
        new URL('/login?error=An%20unexpected%20error%20occurred', requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
