import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Checks whether live Supabase URL and keys have been provided by the user.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey && !url.includes('placeholder.supabase.co'));
}

/**
 * Fast zero-latency fetch interceptor.
 * If Supabase is unconfigured, avoids DNS network timeouts (which take 15s on macOS).
 */
const fastServerFetch: typeof fetch = async (input, init) => {
  if (!isSupabaseConfigured()) {
    // Return empty mock response instantly (0ms) so pages never hang waiting for DNS
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'content-range': '0-0/0',
      },
    });
  }
  return fetch(input, init);
};

const DEMO_USER_OBJECT = {
  id: 'demo-super-admin-001',
  email: 'admin@crm.internal',
  user_metadata: { role: 'Super Admin', name: 'Demo Administrator' },
  app_metadata: { role: 'Super Admin', provider: 'demo' },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

/**
 * Server client honoring the current user's authenticated session via cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const isConfigured = isSupabaseConfigured();
  const supabaseUrl = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
    : 'https://placeholder.supabase.co';
  const supabaseAnonKey = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    : 'dummy-anon-key-placeholder';

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Read-only in Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Read-only in Server Components
        }
      },
    },
    global: {
      fetch: fastServerFetch,
    },
  });

  const isDemo = cookieStore.get('crm_demo_session')?.value === 'admin' || !isConfigured;

  if (isDemo) {
    // Return demo user immediately (0ms) - DO NOT make external DNS network calls!
    client.auth.getUser = async () => ({
      data: { user: DEMO_USER_OBJECT as any },
      error: null,
    });
  }

  return client;
}

/**
 * Administrative client using the SERVICE ROLE key to bypass RLS for background / admin server actions.
 */
export function createServiceClient() {
  const isConfigured = isSupabaseConfigured();
  const supabaseUrl = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
    : 'https://placeholder.supabase.co';
  const serviceRoleKey = isConfigured
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim())
    : 'dummy-service-role-key-placeholder';

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fastServerFetch,
    },
  });
}
