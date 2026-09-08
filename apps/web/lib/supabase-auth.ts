import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeRoleKey, getPermissionsForRole } from '@/lib/rbac-data';

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
let supabaseAdminClient: SupabaseClient | null = null;

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

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('[Security Violation] Supabase Service Role client must never be instantiated in the browser.');
  }
  if (!supabaseAdminClient) {
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!serviceKey) {
      throw new Error('[Security Exception] SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
    }
    supabaseAdminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminClient;
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
 * Request password recovery email via central API with SMTP delivery
 */
export async function requestPasswordReset(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!isAllowedWorkDomain(cleanEmail)) {
    throw new Error(getDomainRestrictionError(cleanEmail));
  }

  const res = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to dispatch password recovery email.');
  }

  return { data, error: null };
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

export function buildUserSessionPayload(user: any, fallbackEmployee?: any): AppUserSession {
  const email = (user.email || '').toLowerCase().trim();
  const userId = (user.id || '').trim();
  const meta = user.user_metadata || {};

  // Check if we have cached employee profiles to extract canonical employee details
  let matchedEmp = fallbackEmployee || null;
  if (!matchedEmp && typeof window !== 'undefined') {
    try {
      const cachedRaw = localStorage.getItem('jaago_pnc_employees_v2');
      if (cachedRaw) {
        const list = JSON.parse(cachedRaw);
        if (Array.isArray(list)) {
          matchedEmp = list.find((e: any) => {
            const wEmail = (e.workEmail || e.work_email || '').toLowerCase().trim();
            const pEmail = (e.personalEmail || e.personal_email || '').toLowerCase().trim();
            const empUserId = (e.userId || e.user_id || '').trim();
            return (
              (email && (wEmail === email || pEmail === email)) ||
              (userId && empUserId === userId) ||
              (email.includes('nasif.kamal') && (wEmail.includes('nasif') || (e.name || '').toLowerCase().includes('nasif')))
            );
          });
        }
      }

      if (!matchedEmp) {
        const prevUserRaw = localStorage.getItem('jaago_user');
        if (prevUserRaw) {
          const prevU = JSON.parse(prevUserRaw);
          if (prevU && (prevU.email?.toLowerCase().trim() === email || prevU.id === userId)) {
            matchedEmp = prevU;
          }
        }
      }
    } catch {}
  }

  const rawRole = (meta['role'] || (Array.isArray(meta['roles']) ? meta['roles'][0] : '') || 'USER').toString();
  const rawRoleUpper = rawRole.toUpperCase();

  // Super Admin check: either explicit super_admin role, is_super_admin flag, or system architect email
  const isSuper =
    rawRoleUpper === 'SUPER_ADMIN' ||
    rawRole.toLowerCase() === 'super_admin' ||
    meta['is_super_admin'] === true ||
    email.includes('nasif.kamal');

  // Normalized RBAC Role Key
  const normKey = isSuper ? 'super_admin' : normalizeRoleKey(rawRole);

  const canonicalRole = isSuper
    ? 'SUPER_ADMIN'
    : normKey === 'admin'
    ? 'ADMIN'
    : normKey === 'executive_director'
    ? 'EXECUTIVE_DIRECTOR'
    : normKey === 'dept_manager'
    ? 'DEPT_MANAGER'
    : normKey === 'finance_lead'
    ? 'FINANCE_LEAD'
    : normKey === 'pnc_officer'
    ? 'PNC_OFFICER'
    : normKey === 'auditor'
    ? 'AUDITOR'
    : normKey === 'cluster_head'
    ? 'CLUSTER_HEAD'
    : 'USER';

  const roles = isSuper
    ? ['super_admin', 'coordinator']
    : normKey === 'admin'
    ? ['admin', 'pnc_lead']
    : [normKey];

  // Dynamic RBAC Permissions from Central RBAC Matrix or user_metadata
  const permissions = isSuper
    ? ['*']
    : Array.isArray(meta['permissions']) && meta['permissions'].length > 0
    ? meta['permissions']
    : getPermissionsForRole(normKey);

  const canonicalFullName =
    matchedEmp?.name ||
    matchedEmp?.fullName ||
    meta['full_name'] ||
    meta['name'] ||
    user.email?.split('@')[0] ||
    'User';

  const canonicalAvatar =
    matchedEmp?.avatarUrl ||
    matchedEmp?.avatar_url ||
    meta['avatar_url'] ||
    meta['picture'] ||
    '';

  const canonicalJobTitle =
    matchedEmp?.designation ||
    matchedEmp?.jobTitle ||
    meta['job_title'] ||
    meta['designation'] ||
    (isSuper ? 'Coordinator' : 'Staff Member');

  const canonicalDepartment =
    matchedEmp?.department ||
    meta['department'] ||
    'General';

  const canonicalBranch =
    matchedEmp?.branch ||
    meta['branch'] ||
    'Head Office (Banani)';

  const canonicalEmployeeCode =
    matchedEmp?.code ||
    matchedEmp?.employeeCode ||
    meta['employee_code'] ||
    meta['employee_id'] ||
    '';

  const canonicalOrgName =
    matchedEmp?.organization ||
    matchedEmp?.organizationName ||
    meta['organization_name'] ||
    'JAAGO Foundation Trust';

  return {
    id: user.id,
    email: user.email,
    fullName: canonicalFullName,
    avatarUrl: canonicalAvatar,
    jobTitle: canonicalJobTitle,
    department: canonicalDepartment,
    branch: canonicalBranch,
    employeeCode: canonicalEmployeeCode,
    organizationName: canonicalOrgName,
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
    localStorage.removeItem('jaago_first_checkin_time');
    localStorage.removeItem('jaago_last_checkout_time');
    localStorage.removeItem('jaago_worked_seconds');
    localStorage.removeItem('jaago_auto_checked_out');
    localStorage.removeItem('jaago_today_date');
    localStorage.removeItem('jaago_active_user_permissions');

    // Clean up any jaago_att_* keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('jaago_att_') || key.startsWith('jaago_user_permissions_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    document.cookie = 'jaago_access_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'jaago_user=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/login';
  }
}

