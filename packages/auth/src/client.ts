import { createClient, SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabaseAnonClient(): SupabaseClient {
  if (anonClient) {
    return anonClient;
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://mock.supabase.co';
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'mock-anon-key-00000000000000000000';

  anonClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return anonClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('[Security Violation] Supabase Service Role client must never be instantiated in the browser.');
  }

  if (adminClient) {
    return adminClient;
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://mock.supabase.co';
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'mock-service-role-key-0000000000000';

  adminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
