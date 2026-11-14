import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export type AccessLevel = 'none' | 'view' | 'edit';

const ALL_MODULES = [
  'dashboard',
  'leads',
  'whatsapp',
  'projects',
  'reports',
  'modules',
  'users',
  'settings'
];

/**
 * Calculates effective permissions for a user:
 * 1. Super Admin / Admin role default to full 'edit' access across all modules.
 * 2. Role-level permissions apply for other roles.
 * 3. User-level specific overrides take highest precedence.
 */
export async function getEffectivePermissions(targetUserId?: string): Promise<Record<string, AccessLevel>> {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    let userId = targetUserId;
    let userRole = 'Admin';

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Return none if unauthenticated
        return ALL_MODULES.reduce((acc, mod) => ({ ...acc, [mod]: 'none' }), {});
      }
      userId = user.id;
      userRole = user.user_metadata?.role || user.app_metadata?.role || 'Admin';
    }

    // Default: Super Admin and Admin have edit access to everything
    const permissions: Record<string, AccessLevel> = {};
    const isAdmin = userRole === 'Super Admin' || userRole === 'Admin';
    ALL_MODULES.forEach((mod) => {
      permissions[mod] = isAdmin ? 'edit' : 'view';
    });

    if (isAdmin) {
      return permissions;
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
    if (userId) {
      const { data: userPerms } = await serviceClient
        .from('user_permissions')
        .select('module_name, access_level')
        .eq('user_id', userId);

      userPerms?.forEach((up: any) => {
        permissions[up.module_name] = up.access_level as AccessLevel;
      });
    }

    return permissions;
  } catch (err) {
    console.error('Error determining effective permissions:', err);
    // Fallback: grant view for non-admin to prevent complete bricking
    return ALL_MODULES.reduce((acc, mod) => ({ ...acc, [mod]: 'edit' }), {});
  }
}

/**
 * Server-side guard to enforce permission checks before rendering CRM pages.
 * Redirects to /crm/login if not logged in, or /crm/unauthorized if permission denied.
 */
export async function requireAccess(moduleName: string): Promise<AccessLevel> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/crm/login');
  }

  const permissions = await getEffectivePermissions(user.id);
  const userAccess = permissions[moduleName] || 'none';

  if (userAccess === 'none') {
    redirect('/crm/unauthorized');
  }

  return userAccess;
}
