import {
  getSupabaseBrowserClient,
  isAllowedWorkDomain,
  getDomainRestrictionError,
  ALLOWED_WORK_DOMAINS,
  type SupabaseClient,
} from '@jaago/auth';

export { isAllowedWorkDomain, getDomainRestrictionError, ALLOWED_WORK_DOMAINS, type SupabaseClient };

export function getSupabase(): SupabaseClient {
  return getSupabaseBrowserClient();
}

/**
 * Sign in using Google Workspace OAuth via Supabase
 */
export async function signInWithGoogle() {
  const supabase = getSupabase();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
}

/**
 * Request password recovery email via Supabase Auth
 */
export async function requestPasswordReset(email: string) {
  if (!isAllowedWorkDomain(email)) {
    throw new Error(getDomainRestrictionError(email));
  }

  const supabase = getSupabase();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${origin}/reset-password`,
  });
}

/**
 * Update user password after reset redirect
 */
export async function updatePassword(newPassword: string) {
  const supabase = getSupabase();
  return await supabase.auth.updateUser({
    password: newPassword,
  });
}
