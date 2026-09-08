import { getSupabaseAdminClient } from './client';
import { UnauthorizedError } from '@jaago/contracts';

export interface UserSession {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  mfaVerified: boolean;
}

export async function validateAccessToken(token: string): Promise<UserSession> {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Authentication token is required');
  }

  // Only allow mock testing tokens in explicit automated testing environment
  if (process.env.NODE_ENV === 'test' && (token.startsWith('mock-') || token.startsWith('test-'))) {
    return {
      userId: 'test-mock-user-id',
      email: 'tester@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      roles: ['super_admin'],
      permissions: ['*'],
      isSuperAdmin: true,
      mfaVerified: true,
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data?.user) {
      const user = data.user;
      const userMetadata = user.user_metadata || {};
      const rawRole = (userMetadata['role'] || (Array.isArray(userMetadata['roles']) ? userMetadata['roles'][0] : '') || 'USER').toString();
      const rawRoleUpper = rawRole.toUpperCase();
      const isSuper =
        rawRoleUpper === 'SUPER_ADMIN' ||
        rawRole.toLowerCase() === 'super_admin' ||
        userMetadata['is_super_admin'] === true;

      const isAdmin =
        isSuper ||
        rawRoleUpper === 'ADMIN' ||
        rawRoleUpper === 'HR_MANAGER' ||
        rawRoleUpper === 'HR_ADMIN' ||
        rawRole.toLowerCase() === 'admin' ||
        rawRole.toLowerCase() === 'hr_manager' ||
        rawRole.toLowerCase() === 'coordinator';

      const roles = userMetadata['roles'] || (isSuper
        ? ['super_admin', 'coordinator']
        : isAdmin
        ? ['admin', rawRole.toLowerCase()]
        : ['user']);

      const permissions = userMetadata['permissions'] || (isSuper
        ? ['*']
        : isAdmin
        ? ['hr.*', 'finance.*', 'pnc.*', 'attendance.*', 'leaves.*', 'directory.*', 'system.*']
        : ['self.attendance', 'self.leaves', 'self.profile', 'self.requests']);

      return {
        userId: user.id,
        email: user.email || '',
        organizationId: userMetadata['organization_id'] || 'org-jaago-dhaka',
        roles,
        permissions,
        isSuperAdmin: isSuper,
        mfaVerified: Boolean(user.app_metadata?.['aal'] === 'aal2'),
      };
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
  }

  throw new UnauthorizedError('Invalid or expired authentication session');
}

export function extractBearerToken(authHeader?: string | null): string | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  return authHeader.slice(7).trim();
}

/**
 * Extracts session token from either Authorization header or request Cookies
 */
export function extractTokenFromRequest(request: Request): string | undefined {
  const authHeader = request.headers.get('authorization');
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) return bearerToken;

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('jaago_access_token=')) {
        return decodeURIComponent(cookie.slice('jaago_access_token='.length));
      }
    }
  }
  return undefined;
}


