import { z } from 'zod';
import { createApiHandler } from '@jaago/authz';
import { getSupabaseAnonClient, isAllowedWorkDomain, getDomainRestrictionError } from '@jaago/auth';
import { logger } from '@jaago/logger';
import { ValidationError } from '@jaago/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
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

    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid email format');
    }

    const { email } = parsed.data;

    // Strict domain check
    if (!isAllowedWorkDomain(email)) {
      logger.warn('SECURITY', 'auth.forgot_password.domain_rejected', { metadata: { email } });
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

    try {
      const supabase = getSupabaseAnonClient();
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${origin}/reset-password`,
      });

      if (error) {
        logger.warn('AUTH', 'user.reset_password.error', { metadata: { email, error: error.message } });
      } else {
        logger.info('AUTH', 'user.reset_password.dispatched', { metadata: { email } });
      }

      return Response.json({
        success: true,
        message: `Password reset instructions have been dispatched to ${email}.`,
      });
    } catch (err: any) {
      logger.error('AUTH', 'user.reset_password.failed', { metadata: { email, err: err.message } });
      return Response.json({
        success: true,
        message: `Password reset request registered for ${email}.`,
      });
    }
  },
});
