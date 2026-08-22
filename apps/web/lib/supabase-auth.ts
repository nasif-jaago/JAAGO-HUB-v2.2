import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const ALLOWED_WORK_DOMAINS = [
  '@jaago.com.bd',
  '@jaagofoundation.org',
  '@emkcenter.org',
] as const;

export function isAllowedWorkDomain(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.toLowerCase().trim();
  return ALLOWED_WORK_DOMAINS.some((domain) => normalized.endsWith(domain));
}

export function getDomainRestrictionError(email?: string): string {
  return `Access Restricted: Only official organization email domains (@jaago.com.bd, @jaagofoundation.org, @emkcenter.org) are permitted to sign in to JAAGO HUB.${
    email ? ` ("${email}" is not an authorized domain)` : ''
  }`;
}

const supabaseUrl =
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
const supabaseAnonKey =
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzQ2NTcsImV4cCI6MjEwMjgxMDY1N30.YnZZloLZnLA77mbqnZmkw35dKPLx3XG-lQY89t9NpeQ';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
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
