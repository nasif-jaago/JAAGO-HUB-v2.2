import { z } from 'zod';
import { createApiHandler } from '@jaago/authz';
import { getSupabaseAdminClient, isAllowedWorkDomain, getDomainRestrictionError } from '@jaago/auth';
import { logger } from '@jaago/logger';
import { ValidationError } from '@jaago/contracts';
import { sendEmail } from '@/lib/email-service';

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

    const cleanEmail = parsed.data.email.trim().toLowerCase();

    // Strict domain check
    if (!isAllowedWorkDomain(cleanEmail)) {
      logger.warn('SECURITY', 'auth.forgot_password.domain_rejected', { metadata: { email: cleanEmail } });
      return Response.json(
        {
          success: false,
          error: {
            message: getDomainRestrictionError(cleanEmail),
            code: 'AUTH_DOMAIN_RESTRICTED',
          },
        },
        { status: 403 }
      );
    }

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

      // 1. Check if user exists in auth.users
      const { data: userListData } = await supabaseAdmin.auth.admin.listUsers();
      let targetUser = userListData?.users?.find(
        (u) => (u.email || '').toLowerCase().trim() === cleanEmail
      );

      // 2. If not found in auth.users, check if they exist in the employees directory
      if (!targetUser) {
        const { data: empMatch } = await supabaseAdmin
          .from('employees')
          .select('id, code, name, designation, department, organization, work_email, personal_email, avatar_url')
          .or(`work_email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail}`)
          .maybeSingle();

        if (empMatch) {
          // Auto-provision auth user so they can reset password and log in
          const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true,
            user_metadata: {
              full_name: empMatch.name,
              name: empMatch.name,
              job_title: empMatch.designation,
              department: empMatch.department,
              organization_name: empMatch.organization || 'JAAGO Foundation Trust',
              employee_code: empMatch.code,
              avatar_url: empMatch.avatar_url || '',
            },
          });

          if (!createAuthError && newAuthData?.user) {
            targetUser = newAuthData.user;
            // Link employee record to auth user id
            await supabaseAdmin
              .from('employees')
              .update({ user_id: newAuthData.user.id, is_user: true })
              .eq('id', empMatch.id);
          }
        }
      }

      // 3. Generate secure, single-use password recovery link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: {
          redirectTo: `${origin}/reset-password`,
        },
      });

      if (linkError || !linkData?.properties?.action_link) {
        logger.error('AUTH', 'user.generate_recovery_link.failed', {
          metadata: { email: cleanEmail, error: linkError?.message },
        });
        throw new Error(linkError?.message || 'Failed to generate secure password recovery link.');
      }

      const hashedToken = linkData.properties?.hashed_token;
      const directResetUrl = `${origin}/reset-password?token_hash=${hashedToken}&type=recovery`;
      const resetActionLink = linkData.properties?.action_link || directResetUrl;

      // 4. Dual-Channel Delivery:
      // Channel A: Native Supabase Auth delivery (if configured in Supabase Cloud)
      try {
        await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${origin}/reset-password`,
        });
      } catch (supaErr: any) {
        logger.info('AUTH', 'user.reset_password.native_supabase_note', {
          metadata: { email: cleanEmail, note: supaErr?.message },
        });
      }

      // Channel B: Central Outbound Mailer Service (Brevo SMTP with branded template)
      const mailResult = await sendEmail({
        templateKey: 'auth.password_reset',
        to: cleanEmail,
        variables: {
          email: cleanEmail,
          resetUrl: directResetUrl,
        },
        module: 'auth',
      });

      if (!mailResult.success) {
        logger.warn('AUTH', 'user.reset_password.email_warning', {
          metadata: { email: cleanEmail, error: mailResult.errorReason },
        });
      } else {
        logger.info('AUTH', 'user.reset_password.dispatched_smtp', {
          metadata: { email: cleanEmail, logId: mailResult.logId },
        });
      }

      const isDev = process.env.NODE_ENV !== 'production' || origin.includes('localhost') || origin.includes('127.0.0.1');

      return Response.json({
        success: true,
        message: `Password reset instructions have been dispatched to ${cleanEmail}. Please check your inbox.`,
        ...(isDev
          ? {
              debug: {
                directResetUrl,
                actionLink: resetActionLink,
                emailOtp: linkData.properties?.email_otp,
              },
            }
          : {}),
      });
    } catch (err: any) {
      logger.error('AUTH', 'user.reset_password.failed', { metadata: { email: cleanEmail, error: err.message } });
      return Response.json(
        {
          success: false,
          error: {
            message: err.message || 'Failed to dispatch password recovery email. Please try again.',
            code: 'RESET_PASSWORD_FAILED',
          },
        },
        { status: 500 }
      );
    }
  },
});
