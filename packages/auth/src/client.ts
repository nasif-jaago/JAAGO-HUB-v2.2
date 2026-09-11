import { createClient, SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabaseAnonClient(): SupabaseClient {
  if (anonClient) {
    return anonClient;
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
  const anonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzQ2NTcsImV4cCI6MjEwMjgxMDY1N30.YnZZloLZnLA77mbqnZmkw35dKPLx3XG-lQY89t9NpeQ';

  anonClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return anonClient;
}

function resolveServiceRoleKey(): string | undefined {
  const direct = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (direct) return direct;

  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '.env.local'),
        path.resolve(process.cwd(), 'apps/web/.env.local'),
        path.resolve(process.cwd(), 'apps/web/.env'),
        path.resolve(process.cwd(), '../../.env'),
      ];
      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const lines = fs.readFileSync(file, 'utf8').split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
              const val = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim().replace(/^["']|["']$/g, '');
              if (val) {
                process.env['SUPABASE_SERVICE_ROLE_KEY'] = val;
                return val;
              }
            }
          }
        }
      }
    } catch {
      // Ignore filesystem read errors in sandboxed environments
    }
  }
  return undefined;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('[Security Violation] Supabase Service Role client must never be instantiated in the browser.');
  }

  if (adminClient) {
    return adminClient;
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
  const serviceKey = resolveServiceRoleKey();

  if (!serviceKey) {
    throw new Error('[Security Exception] SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
  const anonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzQ2NTcsImV4cCI6MjEwMjgxMDY1N30.YnZZloLZnLA77mbqnZmkw35dKPLx3XG-lQY89t9NpeQ';

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
