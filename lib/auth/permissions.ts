import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export type AccessLevel = 'none' | 'view' | 'edit';

const ALL_MODULES = [
  'dashboard',
  'leads',
  'inbox',
  'whatsapp',
  'reports',
  'modules',
  'users',
  'settings'
];

export interface AuthSessionInfo {
  user: any;
  role: string;
  permissions: Record<string, AccessLevel>;
}

/**
 * Request-scoped cached auth session retriever using React cache().
 * Deduplicates multiple supabase.auth.getUser() and profile queries across requireAccess and page components.
 */
export const getCachedAuthSession = cache(async (): Promise<AuthSessionInfo> => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        role: 'Admin',
        permissions: ALL_MODULES.reduce((acc, mod) => ({ ...acc, [mod]: 'none' as AccessLevel }), {})
      };
    }

    const serviceClient = createServiceClient();
    let userRole = user.user_metadata?.role || user.app_metadata?.role || 'Admin';

    // Fetch latest role from database profiles table
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role) {
      userRole = profile.role;
    }

    // Default: Super Admin and Admin have edit access to everything
    const permissions: Record<string, AccessLevel> = {};
    const isAdmin = userRole === 'Super Admin' || userRole === 'Admin';
    ALL_MODULES.forEach((mod) => {
      permissions[mod] = isAdmin ? 'edit' : 'view';
    });

    if (isAdmin) {
      return { user, role: userRole, permissions };
    }

    // Check Role Permissions
    const { data: roleRow } = await serviceClient
      .from('roles')
      .select('id')
      .eq('name', userRole)
      .maybeSingle();

    if (roleRow?.id) {
      const { data: rolePerms } = await serviceClient
        .from('role_permissions')
        .select('module_name, access_level')
        .eq('role_id', roleRow.id);

      rolePerms?.forEach((rp: any) => {
        permissions[rp.module_name] = rp.access_level as AccessLevel;
      });
    }

    // Check User-specific Override Permissions
    const { data: userPerms } = await serviceClient
      .from('user_permissions')
      .select('module_name, access_level')
      .eq('user_id', user.id);

    userPerms?.forEach((up: any) => {
      permissions[up.module_name] = up.access_level as AccessLevel;
    });

    return { user, role: userRole, permissions };
  } catch (err) {
    console.error('Error fetching cached auth session:', err);
    return {
      user: null,
      role: 'Admin',
      permissions: ALL_MODULES.reduce((acc, mod) => ({ ...acc, [mod]: 'none' as AccessLevel }), {})
    };
  }
});

/**
 * Calculates effective permissions for a user:
 * 1. Super Admin / Admin role default to full 'edit' access across all modules.
 * 2. Role-level permissions apply for other roles.
 * 3. User-level specific overrides take highest precedence.
 */
export async function getEffectivePermissions(targetUserId?: string): Promise<Record<string, AccessLevel>> {
  const session = await getCachedAuthSession();

  if (targetUserId && targetUserId !== session.user?.id) {
    try {
      const serviceClient = createServiceClient();
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .maybeSingle();

      const userRole = profile?.role || 'Admin';
      const permissions: Record<string, AccessLevel> = {};
      const isAdmin = userRole === 'Super Admin' || userRole === 'Admin';
      ALL_MODULES.forEach((mod) => {
        permissions[mod] = isAdmin ? 'edit' : 'view';
      });

      if (isAdmin) {
        return permissions;
      }

      const { data: roleRow } = await serviceClient
        .from('roles')
        .select('id')
        .eq('name', userRole)
        .maybeSingle();

      if (roleRow?.id) {
        const { data: rolePerms } = await serviceClient
          .from('role_permissions')
          .select('module_name, access_level')
          .eq('role_id', roleRow.id);

        rolePerms?.forEach((rp: any) => {
          permissions[rp.module_name] = rp.access_level as AccessLevel;
        });
      }

      return permissions;
    } catch (err) {
      console.error('Error determining effective permissions for target user:', err);
      return ALL_MODULES.reduce((acc, mod) => ({ ...acc, [mod]: 'edit' as AccessLevel }), {});
    }
  }

  return session.permissions;
}

/**
 * Server-side guard to enforce permission checks before rendering CRM pages.
 * Redirects to /crm/login if not logged in, or /crm/unauthorized if permission denied.
 * Returns the cached user, verified role, and accessLevel for immediate zero-latency reuse.
 */
export async function requireAccess(moduleName: string): Promise<{ user: any; role: string; accessLevel: AccessLevel }> {
  const session = await getCachedAuthSession();

  if (!session.user) {
    redirect('/crm/login');
  }

  let userAccess = session.permissions[moduleName];
  if (!userAccess || userAccess === 'none') {
    if (moduleName === 'inbox') userAccess = session.permissions['whatsapp'];
    else if (moduleName === 'whatsapp') userAccess = session.permissions['inbox'];
  }
  userAccess = userAccess || 'none';

  if (userAccess === 'none') {
    redirect('/crm/unauthorized');
  }

  return { user: session.user, role: session.role, accessLevel: userAccess };
}
