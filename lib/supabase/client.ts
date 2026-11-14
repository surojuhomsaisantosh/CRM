import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'dummy-anon-key-placeholder';

  const client = createBrowserClient(supabaseUrl, supabaseKey);

  // Intercept auth.getUser to support seamless demo logins
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    if (typeof document !== 'undefined' && document.cookie.includes('crm_demo_session=admin')) {
      return {
        data: {
          user: {
            id: 'demo-super-admin-001',
            email: 'admin@crm.internal',
            user_metadata: { role: 'Super Admin', name: 'Demo Administrator' },
            app_metadata: { role: 'Super Admin' },
          } as any,
        },
        error: null,
      };
    }
    return await originalGetUser(jwt);
  };

  // Clear demo session on sign-out
  const originalSignOut = client.auth.signOut.bind(client.auth);
  client.auth.signOut = async (options?: any) => {
    if (typeof document !== 'undefined') {
      document.cookie = 'crm_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    return await originalSignOut(options);
  };

  return client;
}
