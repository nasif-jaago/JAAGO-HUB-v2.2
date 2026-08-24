import { z } from 'zod';
import { createApiHandler } from '@jaago/authz';
import { getSupabaseAnonClient } from '@jaago/auth';
import { logger } from '@jaago/logger';
import { AppError, ErrorCode, ValidationError } from '@jaago/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SignInSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const POST = createApiHandler({
  requireAuth: false,
  async handler(request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = SignInSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid credentials format');
    }

    const { email, password } = parsed.data;

    // Strict domain check: Only @jaago.com.bd, @jaagofoundation.org, @emkcenter.org
    const { isAllowedWorkDomain, getDomainRestrictionError } = await import('@jaago/auth');
    if (!isAllowedWorkDomain(email)) {
      logger.warn('SECURITY', 'auth.domain_rejected', { metadata: { email } });
      return Response.json(
        {
          success: false,
          error: {
            message: getDomainRestrictionError(email),
            code: 'AUTH_DOMAIN_RESTRICTED',
          },
        },
        { status: 403 }
      );
    }

    // Supabase Authentication
    try {
      const supabase = getSupabaseAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user || !data.session) {
        logger.warn('SECURITY', 'user.signin.failed', {
          errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
          metadata: { email, error: error?.message },
        });

        throw new AppError(error?.message || 'Invalid email or password', {
          code: ErrorCode.AUTH_INVALID_CREDENTIALS,
          statusCode: 401,
        });
      }

      logger.info('AUTH', 'user.signin.success', {
        userId: data.user.id,
        metadata: { email },
      });

      const userObj = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata['full_name'] || data.user.user_metadata['name'] || email,
        organizationId: data.user.user_metadata['organization_id'] || 'org-jaago-dhaka',
        organizationName: 'JAAGO Foundation Trust',
        roles: ['super_admin', 'coordinator'],
        permissions: ['system.*', 'hr.*', 'finance.*', 'pnc.*'],
      };

      const response = Response.json({
        user: userObj,
        session: {
          accessToken: data.session.access_token,
          expiresIn: data.session.expires_in,
        },
      });

      response.headers.append(
        'Set-Cookie',
        `jaago_access_token=${data.session.access_token}; Path=/; Max-Age=${data.session.expires_in || 604800}; SameSite=Lax`
      );
      response.headers.append(
        'Set-Cookie',
        `jaago_user=${encodeURIComponent(JSON.stringify(userObj))}; Path=/; Max-Age=${data.session.expires_in || 604800}; SameSite=Lax`
      );

      return response;
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      throw new AppError(err.message || 'Invalid email or password', {
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        statusCode: 401,
      });
    }
  },
});

