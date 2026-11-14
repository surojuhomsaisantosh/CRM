'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendUserCredentials, sendPasswordResetLink } from '@/lib/resend'
import { validatePasswordPolicy } from '@/lib/auth/password-policy'

function getAdminClient() {
  return createServiceClient()
}

/**
 * Strict authorization check: verifies caller's authenticated session and role
 */
async function requireAdminSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { authorized: false, error: 'Unauthorized: Valid session required. Please log in.', user: null }
  }

  const supabaseAdmin = getAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  const role = profile?.role || user.user_metadata?.role
  if (role !== 'Super Admin' && role !== 'Admin') {
    return { authorized: false, error: 'Forbidden: Insufficient privileges to perform user management actions.', user: null }
  }

  return { authorized: true, user, role, email: profile?.email || user.email, error: null }
}

export async function addAdminUser(formData: FormData) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  const email = formData.get('email') as string
  const role = formData.get('role') as string || 'Admin'
  const name = formData.get('name') as string || ''

  if (!email) {
    return { error: 'Email is required.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return { error: 'Supabase credentials not configured yet in .env.local' }
  }

  // Generate a strong random password to fulfill Supabase requirements
  const password = crypto.randomUUID() + crypto.randomUUID();
  const supabaseAdmin = getAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: name }
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.user) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: data.user.id, email, role: role, name: name }, { onConflict: 'id' })

    if (updateError) {
      console.error('Failed to write profiles row, rolling back auth user:', updateError.message)
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      return { error: `Could not grant CRM access: ${updateError.message}` }
    }

    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/crm/login`
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: loginUrl
      }
    })

    if (linkError || !linkData.properties?.action_link) {
      console.error('Failed to generate invite link:', linkError?.message)
    } else {
      await sendUserCredentials(email, name, role, linkData.properties.action_link)
    }
  }

  return { success: true, user: data.user }
}

export async function listAdminUsers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized: Session required.', users: [] }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return {
      success: true,
      users: []
    }
  }

  const supabaseAdmin = getAdminClient()

  const { data: crmProfiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, name, created_at')
    .order('created_at', { ascending: true })

  if (profilesError) {
    return {
      success: true,
      users: []
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    return { error: error.message }
  }

  const authById = new Map<string, any>()
  ;(data?.users || []).forEach((u: any) => authById.set(u.id, u))

  return {
    success: true,
    users: (crmProfiles || []).map((p) => {
      const u = authById.get(p.id)
      return {
        id: p.id,
        email: p.email || u?.email,
        created_at: u?.created_at ?? p.created_at ?? '',
        last_sign_in_at: u?.last_sign_in_at,
        is_disabled: u?.user_metadata?.is_disabled || false,
        role: p.role || u?.user_metadata?.role || 'admin',
        name: p.name || u?.user_metadata?.full_name || '',
      }
    }),
  }
}

export async function deleteAdminUser(id: string) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  if (auth.user?.id === id) {
    return { error: 'Action denied: You cannot delete your own account.' }
  }

  const supabaseAdmin = getAdminClient()

  // Protect root super admin
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('email, role')
    .eq('id', id)
    .single()

  if (targetProfile?.email === 'surojusantosh125@gmail.com') {
    return { error: 'Action denied: The primary root Super Admin account cannot be deleted.' }
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function changeAdminPassword(formData: FormData) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  const id = formData.get('id') as string
  const password = formData.get('password') as string
  if (!id || !password) return { error: 'ID and new password are required' }

  const policy = validatePasswordPolicy(password)
  if (!policy.isValid) {
    return { error: 'Password does not meet required policy (12-20 characters, 1 uppercase, 1 number, 1 special character).' }
  }

  const supabaseAdmin = getAdminClient()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
  if (error) return { error: error.message }
  return { success: true }
}

export async function toggleAdminStatus(id: string, disable: boolean) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  if (auth.user?.id === id) {
    return { error: 'Action denied: You cannot disable your own account.' }
  }

  const supabaseAdmin = getAdminClient()

  // Protect root super admin from being disabled
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', id)
    .single()

  if (targetProfile?.email === 'surojusantosh125@gmail.com' && disable) {
    return { error: 'Action denied: The primary root Super Admin account cannot be disabled.' }
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { is_disabled: disable }
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function sendPasswordResetEmail(email: string) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  if (!email) return { error: 'Email is required' }

  const cleanEmail = email.trim().toLowerCase()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const redirectUrl = `${baseUrl}/auth/callback?next=/crm/reset-password`

  const supabase = await createClient()
  const supabaseAdmin = getAdminClient()

  // 1. Generate direct 1-click password recovery action link via Admin Client
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: cleanEmail,
    options: {
      redirectTo: redirectUrl
    }
  })

  const actionLink = linkData?.properties?.action_link || null

  // 2. Dispatch real password reset email via Supabase Auth native delivery
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl
  })

  // 3. If external Resend provider is configured, also dispatch via Resend
  if (actionLink) {
    await sendPasswordResetLink(cleanEmail, actionLink)
  }

  if (resetError && linkError) {
    return { error: resetError?.message || linkError?.message || 'Failed to dispatch password reset email' }
  }

  return { 
    success: true, 
    resetLink: actionLink,
    emailSent: !resetError 
  }
}

export async function editAdminUser(formData: FormData) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  const id = formData.get('id') as string
  const role = formData.get('role') as string
  const name = formData.get('name') as string

  if (!id || !role || !name) return { error: 'ID, role and name are required' }

  const supabaseAdmin = getAdminClient()

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { role, full_name: name }
  })
  if (authError) return { error: authError.message }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role, name })
    .eq('id', id)
    
  if (profileError) return { error: profileError.message }

  return { success: true }
}

export async function getRoles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return { data: [], error: null }
  }

  try {
    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .order('created_at', { ascending: true })

    if (error) {
      // If roles table doesn't exist yet, extract existing roles from profiles without mock fallback
      const { data: profileRoles } = await supabaseAdmin
        .from('profiles')
        .select('role')

      if (profileRoles && profileRoles.length > 0) {
        const unique = Array.from(new Set(profileRoles.map((p: any) => p.role).filter(Boolean)))
        return {
          data: unique.map((name, idx) => ({ id: `role-${idx}`, name })),
          error: null
        }
      }
      return { data: [], error: null }
    }
    return { data: data || [], error: null }
  } catch (err: any) {
    console.error('Error fetching roles:', err)
    return { data: [], error: null }
  }
}

export async function addRole(name: string) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  const supabaseAdmin = getAdminClient()
  const { data, error } = await supabaseAdmin
    .from('roles')
    .insert({ name })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, data }
}

export async function deleteRole(id: string) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  const supabaseAdmin = getAdminClient()
  const { error } = await supabaseAdmin
    .from('roles')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteAndReassignRole(roleId: string, oldRoleName: string, fallbackRoleName: string | null) {
  const auth = await requireAdminSession()
  if (!auth.authorized) return { error: auth.error }

  const supabaseAdmin = getAdminClient()

  if (fallbackRoleName) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: fallbackRoleName })
      .eq('role', oldRoleName)

    if (profileError) return { error: `Failed to reassign in profiles: ${profileError.message}` }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) return { error: `Failed to list auth users: ${listError.message}` }

    const affectedUsers = (users as any[]).filter((u: any) => u.user_metadata?.role === oldRoleName)
    
    for (const u of affectedUsers) {
      await supabaseAdmin.auth.admin.updateUserById(u.id, {
        user_metadata: { ...u.user_metadata, role: fallbackRoleName }
      })
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from('roles')
    .delete()
    .eq('id', roleId)

  if (deleteError) return { error: `Failed to delete role: ${deleteError.message}` }
  
  return { success: true }
}
