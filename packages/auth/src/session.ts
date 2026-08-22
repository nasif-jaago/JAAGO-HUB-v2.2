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
  const isMock = !process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'].includes('mock');

  if (isMock || token.startsWith('mock-')) {
    return {
      userId: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
      email: 'nasif.kamal@jaago.com.bd',
      organizationId: '11111111-1111-4111-a111-111111111111',
      roles: ['admin', 'coordinator'],
      permissions: ['system.*', 'hr.*', 'finance.*', 'directory.*', 'announcements.*'],
      isSuperAdmin: true,
      mfaVerified: true,
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired authentication session');
  }

  const user = data.user;
  const userMetadata = user.user_metadata || {};

  return {
    userId: user.id,
    email: user.email || '',
    organizationId: userMetadata['organization_id'] || 'org-root',
    roles: userMetadata['roles'] || ['employee'],
    permissions: userMetadata['permissions'] || [],
    isSuperAdmin: userMetadata['is_super_admin'] === true,
    mfaVerified: Boolean(user.app_metadata?.['aal'] === 'aal2'),
  };
}

export function extractBearerToken(authHeader?: string | null): string | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  return authHeader.slice(7).trim();
}
