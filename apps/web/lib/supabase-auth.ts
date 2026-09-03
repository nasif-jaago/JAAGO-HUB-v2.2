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
    const isBrowser = typeof window !== 'undefined';
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
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

export interface AppUserSession {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  jobTitle: string;
  department: string;
  branch: string;
  employeeCode: string;
  organizationName: string;
  organizationId: string;
  roles: string[];
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export function buildUserSessionPayload(user: any): AppUserSession {
  const email = (user.email || '').toLowerCase().trim();
  const meta = user.user_metadata || {};

  const rawRole = (meta['role'] || (Array.isArray(meta['roles']) ? meta['roles'][0] : '') || 'USER').toString();
  const rawRoleUpper = rawRole.toUpperCase();

  // Super Admin check: either explicit super_admin role, is_super_admin flag, or system architect email
  const isSuper =
    rawRoleUpper === 'SUPER_ADMIN' ||
    rawRole.toLowerCase() === 'super_admin' ||
    meta['is_super_admin'] === true ||
    email.includes('nasif.kamal');

  // Admin / HR Manager check
  const isAdmin =
    isSuper ||
    rawRoleUpper === 'ADMIN' ||
    rawRoleUpper === 'HR_MANAGER' ||
    rawRoleUpper === 'HR_ADMIN' ||
    rawRole.toLowerCase() === 'admin' ||
    rawRole.toLowerCase() === 'hr_manager' ||
    rawRole.toLowerCase() === 'coordinator';

  const canonicalRole = isSuper ? 'SUPER_ADMIN' : isAdmin ? 'ADMIN' : rawRoleUpper === 'OFFICER' ? 'USER' : rawRoleUpper;

  const roles = isSuper
    ? ['super_admin', 'coordinator']
    : isAdmin
    ? ['admin', rawRole.toLowerCase()]
    : ['user'];

  const permissions = isSuper
    ? ['*']
    : isAdmin
    ? ['hr.*', 'finance.*', 'pnc.*', 'attendance.*', 'leaves.*', 'directory.*', 'system.*']
    : ['self.attendance', 'self.leaves', 'self.profile', 'self.requests'];

  return {
    id: user.id,
    email: user.email,
    fullName: meta['full_name'] || meta['name'] || user.email?.split('@')[0] || 'User',
    avatarUrl: meta['avatar_url'] || meta['picture'] || '',
    jobTitle: meta['job_title'] || meta['designation'] || (isSuper ? 'Coordinator' : 'Staff Member'),
    department: meta['department'] || 'General',
    branch: meta['branch'] || 'Head Office (Banani)',
    employeeCode: meta['employee_code'] || meta['employee_id'] || '',
    organizationName: meta['organization_name'] || 'JAAGO Foundation Trust',
    organizationId: meta['organization_id'] || 'org-jaago-dhaka',
    roles,
    role: canonicalRole,
    permissions,
    isSuperAdmin: isSuper,
  };
}

/**
 * Completely sign out user from Supabase, clear local storage & cookies, and redirect to /login
 */
export async function signOutUser() {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Supabase sign out error:', err);
  }

  try {
    await fetch('/api/v1/auth/sign-out', { method: 'POST' });
  } catch {}

  if (typeof window !== 'undefined') {
    localStorage.removeItem('jaago_access_token');
    localStorage.removeItem('jaago_user');
    localStorage.removeItem('jaago_is_checked_in');
    localStorage.removeItem('jaago_checkin_timestamp');
    document.cookie = 'jaago_access_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'jaago_user=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/login';
  }
}

