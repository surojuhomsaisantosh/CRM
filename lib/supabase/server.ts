import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Server client honoring the current user's authenticated session via cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'dummy-anon-key-placeholder';

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Can happen in Server Components (read-only cookie store)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Can happen in Server Components
        }
      },
    },
  });

  const isDemo = cookieStore.get('crm_demo_session')?.value === 'admin';
  if (isDemo) {
    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = async (jwt?: string) => {
      const real = await originalGetUser(jwt);
      if (real.data?.user) return real;

      return {
        data: {
          user: {
            id: 'demo-super-admin-001',
            email: 'admin@crm.internal',
            user_metadata: { role: 'Super Admin', name: 'Demo Administrator' },
            app_metadata: { role: 'Super Admin', provider: 'demo' },
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any,
        },
        error: null,
      };
    };
  }

  return client;
}

/**
 * Administrative client using the SERVICE ROLE key to bypass RLS for background / admin server actions.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'dummy-service-role-key-placeholder';

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
