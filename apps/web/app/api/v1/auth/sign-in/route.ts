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

    // For test / mock environments or live Supabase instance
    const isMock = !process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'].includes('mock');

    if (isMock) {
      // Mock authenticated session response for development / CI
      const mockUserId = 'aaaa1111-aaaa-4aaa-aaaa-111111111111';
      const mockOrgId = '11111111-1111-4111-a111-111111111111';

      logger.info('AUTH', 'user.signin.success', {
        userId: mockUserId,
        organizationId: mockOrgId,
        metadata: { email },
      });

      return Response.json({
        user: {
          id: mockUserId,
          email,
          fullName: 'Nasif Kamal',
          jobTitle: 'Coordinator',
          organizationId: mockOrgId,
          organizationName: 'JAAGO Foundation Trust',
          roles: ['coordinator', 'admin'],
          permissions: ['system.*', 'hr.*', 'finance.*'],
        },
        session: {
          accessToken: 'mock-jwt-access-token-0001',
          expiresIn: 604800,
        },
      });
    }

    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
      logger.warn('SECURITY', 'user.signin.failed', {
        errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
        metadata: { email },
      });
      throw new AppError('Invalid email or password', {
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        statusCode: 401,
      });
    }

    logger.info('AUTH', 'user.signin.success', {
      userId: data.user.id,
      metadata: { email },
    });

    return Response.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata['full_name'] || email,
        organizationId: data.user.user_metadata['organization_id'] || 'org-root',
      },
      session: {
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in,
      },
    });
  },
});
