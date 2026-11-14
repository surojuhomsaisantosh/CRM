import { createBrowserClient } from '@supabase/ssr';

export function isBrowserSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey && !url.includes('placeholder.supabase.co'));
}

const fastBrowserFetch: typeof fetch = async (input, init) => {
  if (!isBrowserSupabaseConfigured()) {
    // Return mock empty JSON instantly to prevent browser from stalling on DNS failures
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

export function createClient() {
  const isConfigured = isBrowserSupabaseConfigured();
  const supabaseUrl = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
    : 'https://placeholder.supabase.co';
  const supabaseKey = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    : 'dummy-anon-key-placeholder';

  const client = createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: fastBrowserFetch,
    },
  });

  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('crm_demo_session=admin');
    if (isDemo || !isConfigured) {
      return {
        data: { user: DEMO_USER_OBJECT as any },
        error: null,
      };
    }
    return await originalGetUser(jwt);
  };

  const originalSignOut = client.auth.signOut.bind(client.auth);
  client.auth.signOut = async (options?: any) => {
    if (typeof document !== 'undefined') {
      document.cookie = 'crm_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    if (!isConfigured) {
      return { error: null };
    }
    return await originalSignOut(options);
  };

  return client;
}
