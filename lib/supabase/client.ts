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

export function createClient() {
  const isConfigured = isBrowserSupabaseConfigured();
  const supabaseUrl = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
    : 'https://placeholder.supabase.co';
  const supabaseKey = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    : 'dummy-anon-key-placeholder';

  return createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: fastBrowserFetch,
    },
  });
}
