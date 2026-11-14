'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  debugMetaAccessToken,
  fetchPageLeadForms,
  fetchHistoricalLeads,
  subscribePageToLeadgenWebhook
} from '@/lib/meta'

export interface ProjectMetaIntegration {
  id?: string
  project_id: string
  provider: string
  page_id?: string
  page_name?: string
  is_connected: boolean
  webhook_subscribed: boolean
  last_synced_at?: string
  token_status?: 'valid' | 'revoked' | 'expired' | 'missing'
  error_message?: string
}

export interface ProjectRecord {
  id: string
  name: string
  client_name: string
  location?: string
  email?: string
  phone_numbers: string[]
  created_at?: string
  updated_at?: string
  active_forms_count?: number
  inactive_forms_count?: number
  total_forms_count?: number
  meta_integration?: ProjectMetaIntegration
  invite_pending?: boolean
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized: Session required.')
  }
  return user
}

export async function getProjectsWithFormCounts(): Promise<{ data: ProjectRecord[], error: string | null }> {
  try {
    const supabase = await createClient()

    // 1. Fetch projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.warn('Projects table read notice:', projectsError.message)
      return { data: [], error: null }
    }

    // 2. Fetch forms to compute active / inactive form counts per project
    const { data: forms, error: formsError } = await supabase
      .from('meta_forms')
      .select('id, project_id, is_active')

    const formsMap = new Map<string, { active: number, inactive: number }>()

    if (!formsError && forms) {
      forms.forEach(f => {
        if (!f.project_id) return
        const entry = formsMap.get(f.project_id) || { active: 0, inactive: 0 }
        if (f.is_active !== false) {
          entry.active += 1
        } else {
          entry.inactive += 1
        }
        formsMap.set(f.project_id, entry)
      })
    }

    // 3. Fetch Meta integrations
    const { data: integrations } = await supabase
      .from('project_integrations')
      .select('id, project_id, provider, page_id, page_name, is_connected, webhook_subscribed, last_synced_at')

    const integrationsMap = new Map<string, ProjectMetaIntegration>()
    if (integrations) {
      integrations.forEach((item: any) => {
        integrationsMap.set(item.project_id, item)
      })
    }

    // 4. Fetch pending connect tokens
    const { data: pendingTokens } = await supabase
      .from('client_connect_tokens')
      .select('project_id')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())

    const pendingSet = new Set((pendingTokens || []).map((t: any) => t.project_id))

    const enriched = (projects || []).map((p: any) => {
      const counts = formsMap.get(p.id) || { active: 0, inactive: 0 }
      const meta = integrationsMap.get(p.id)
      return {
        ...p,
        phone_numbers: Array.isArray(p.phone_numbers) ? p.phone_numbers : [],
        active_forms_count: counts.active,
        inactive_forms_count: counts.inactive,
        total_forms_count: counts.active + counts.inactive,
        meta_integration: meta || undefined,
        invite_pending: pendingSet.has(p.id) && !meta?.is_connected
      }
    })

    return { data: enriched, error: null }
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to fetch projects' }
  }
}

export async function createProject(formData: {
  name: string
  client_name: string
  location?: string
  email?: string
  phone_numbers: string[]
}) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const name = formData.name?.trim()
    const client_name = formData.client_name?.trim()
    const location = formData.location?.trim() || ''
    const email = formData.email?.trim() || ''
    
    const phone_numbers = (formData.phone_numbers || [])
      .map(p => p.replace(/\D/g, '').slice(0, 10))
      .filter(Boolean)
      .slice(0, 5)

    if (!name) return { error: 'Project name is required' }
    if (!client_name) return { error: 'Client name is required' }

    for (const phone of phone_numbers) {
      if (phone.length !== 10) {
        return { error: `Contact number "${phone}" must be exactly 10 digits` }
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name,
        client_name,
        location,
        email,
        phone_numbers,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/crm/projects')
    revalidatePath('/crm/leads')
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Failed to create project' }
  }
}

export async function updateProject(
  id: string,
  formData: {
    name: string
    client_name: string
    location?: string
    email?: string
    phone_numbers: string[]
  }
) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const name = formData.name?.trim()
    const client_name = formData.client_name?.trim()
    const location = formData.location?.trim() || ''
    const email = formData.email?.trim() || ''
    const phone_numbers = (formData.phone_numbers || [])
      .map(p => p.replace(/\D/g, '').slice(0, 10))
      .filter(Boolean)
      .slice(0, 5)

    if (!name) return { error: 'Project name is required' }
    if (!client_name) return { error: 'Client name is required' }

    for (const phone of phone_numbers) {
      if (phone.length !== 10) {
        return { error: `Contact number "${phone}" must be exactly 10 digits` }
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        name,
        client_name,
        location,
        email,
        phone_numbers,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/crm/projects')
    revalidatePath('/crm/leads')
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Failed to update project' }
  }
}

export async function deleteProject(id: string) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/crm/projects')
    revalidatePath('/crm/leads')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete project' }
  }
}

// -------------------------------------------------------------
// META CONNECT & LEAD SYNC ACTIONS
// -------------------------------------------------------------

/**
 * Generates a secure, 72-hour one-time client connect link for Alice or Bob
 */
export async function generateClientConnectLink(projectId: string) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    // 1. Fetch project to ensure it exists
    const { data: project, error: pErr } = await supabaseAdmin
      .from('projects')
      .select('id, name, client_name')
      .eq('id', projectId)
      .single()

    if (pErr || !project) {
      return { success: false, error: 'Project not found.' }
    }

    // 2. Generate unique secure token
    const token = `inv_${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours

    // Invalidate any previous unused tokens for this project
    await supabaseAdmin
      .from('client_connect_tokens')
      .delete()
      .eq('project_id', projectId)
      .is('used_at', null)

    // Insert new token
    const { error: tokenErr } = await supabaseAdmin
      .from('client_connect_tokens')
      .insert({
        project_id: projectId,
        token,
        expires_at: expiresAt
      })

    if (tokenErr) {
      return { success: false, error: `Failed to create invite token: ${tokenErr.message}` }
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const connectUrl = `${origin}/connect/meta?token=${token}`

    revalidatePath('/crm/projects')

    return {
      success: true,
      token,
      connectUrl,
      projectName: project.name,
      clientName: project.client_name,
      expiresAt
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not generate client connect link' }
  }
}

/**
 * Diagnostics & "Why are leads not working?" automated troubleshooter
 */
export async function checkMetaDiagnostics(projectId: string) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    const { data: integration, error } = await supabaseAdmin
      .from('project_integrations')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error || !integration) {
      return {
        isConnected: false,
        status: 'disconnected',
        message: 'No Facebook Page connected yet for this client.',
        diagnostics: [
          { check: 'Page Connected', passed: false, detail: 'Client has not completed Facebook login.' },
          { check: 'Token Validity', passed: false, detail: 'No Page Access Token found.' },
          { check: 'Webhook Subscription', passed: false, detail: 'Webhook cannot be subscribed without a page token.' },
          { check: 'Active Lead Forms', passed: false, detail: 'No forms synced.' }
        ]
      }
    }

    if (!integration.access_token) {
      return {
        isConnected: false,
        status: 'revoked',
        message: 'Access token is missing or cleared.',
        diagnostics: [
          { check: 'Page Connected', passed: true, detail: `Linked to ${integration.page_name}` },
          { check: 'Token Validity', passed: false, detail: 'Token missing.' },
          { check: 'Webhook Subscription', passed: false, detail: 'Inactive.' },
          { check: 'Active Lead Forms', passed: false, detail: 'Inactive.' }
        ]
      }
    }

    // Run live token validation check via Meta Graph API
    const tokenCheck = await debugMetaAccessToken(integration.access_token)

    // Check forms count
    const { count: formsCount } = await supabaseAdmin
      .from('meta_forms')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    // Check last lead received
    const { data: lastLead } = await supabaseAdmin
      .from('leads')
      .select('created_at')
      .eq('project', integration.page_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const isTokenValid = tokenCheck.isValid
    const isWebhookActive = integration.webhook_subscribed

    return {
      isConnected: integration.is_connected,
      pageId: integration.page_id,
      pageName: integration.page_name,
      isNeverExpiring: tokenCheck.isNeverExpiring ?? true,
      lastSyncedAt: integration.last_synced_at,
      lastLeadAt: lastLead?.created_at,
      formsCount: formsCount || 0,
      tokenStatus: isTokenValid ? 'valid' : 'revoked',
      errorMessage: tokenCheck.errorMessage,
      diagnostics: [
        {
          check: 'Facebook Page Connection',
          passed: true,
          detail: `Page: ${integration.page_name} (ID: ${integration.page_id})`
        },
        {
          check: 'Token Health & Validity',
          passed: isTokenValid,
          detail: isTokenValid
            ? 'Access Token is healthy and permanently active (no expiry date).'
            : `Token Revoked: ${tokenCheck.errorMessage || 'Client may have changed their Facebook password or removed permissions.'}`
        },
        {
          check: 'Real-Time Webhook Active',
          passed: isWebhookActive,
          detail: isWebhookActive
            ? 'Subscribed to real-time Leadgen webhook events.'
            : 'Page is not yet subscribed to webhook events.'
        },
        {
          check: 'Synced Active Forms',
          passed: (formsCount || 0) > 0,
          detail: `${formsCount || 0} Lead Gen forms discovered on this page.`
        }
      ]
    }
  } catch (err: any) {
    return {
      isConnected: false,
      status: 'error',
      message: err.message || 'Diagnostic error'
    }
  }
}

/**
 * Synchronizes all active Meta Lead Forms from the connected Facebook page into the CRM
 */
export async function syncProjectMetaForms(projectId: string) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    const { data: integration, error } = await supabaseAdmin
      .from('project_integrations')
      .select('page_id, page_name, access_token')
      .eq('project_id', projectId)
      .single()

    if (error || !integration?.page_id || !integration?.access_token) {
      return { success: false, error: 'Facebook Page is not connected for this project.' }
    }

    // Also fetch project name
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const formsRes = await fetchPageLeadForms(integration.page_id, integration.access_token)
    if (!formsRes.success) {
      return { success: false, error: formsRes.error || 'Failed to query forms from Meta Graph API.' }
    }

    const forms = formsRes.forms
    if (forms.length === 0) {
      return { success: true, count: 0, message: 'No lead forms found on this Facebook Page.' }
    }

    // Upsert into meta_forms
    const payload = forms.map(f => ({
      project_id: projectId,
      project_name: project?.name || integration.page_name,
      form_id: f.id,
      name: f.name,
      form_name: f.name,
      is_active: f.status === 'ACTIVE',
      status: f.status,
      leads_count: f.leads_count || 0
    }))

    const { error: upsertErr } = await supabaseAdmin
      .from('meta_forms')
      .upsert(payload, { onConflict: 'form_id' })

    if (upsertErr) {
      return { success: false, error: `Error saving forms: ${upsertErr.message}` }
    }

    // Update last_synced_at
    await supabaseAdmin
      .from('project_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('project_id', projectId)

    revalidatePath('/crm/projects')
    revalidatePath('/crm/leads')

    return {
      success: true,
      count: forms.length,
      forms
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync forms from Meta' }
  }
}

/**
 * Retrieves all stored lead gen forms for a project
 */
export async function getProjectMetaForms(projectId: string) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    const { data: forms, error } = await supabaseAdmin
      .from('meta_forms')
      .select('id, form_id, name, form_name, status, is_active, leads_count, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, forms: forms || [] }
  } catch (err: any) {
    return { success: false, error: err.message, forms: [] }
  }
}

/**
 * Manually add a Form ID for a project (useful when a specific form wasn't auto-discovered)
 */
export async function addManualMetaForm(projectId: string, formId: string, formName?: string) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    const cleanFormId = formId.trim()
    if (!cleanFormId) {
      return { success: false, error: 'Form ID cannot be empty.' }
    }

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const nameToUse = formName?.trim() || `Lead Form ${cleanFormId}`

    const { data, error } = await supabaseAdmin
      .from('meta_forms')
      .upsert({
        project_id: projectId,
        project_name: project?.name || 'Project Lead Form',
        form_id: cleanFormId,
        name: nameToUse,
        form_name: nameToUse,
        is_active: true,
        status: 'ACTIVE',
        leads_count: 0
      }, { onConflict: 'form_id' })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/crm/projects')
    return { success: true, form: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Historical Lead Sync: Backfills past leads from a form (up to 90 days)
 */
export async function syncHistoricalMetaLeads(
  projectId: string,
  formId?: string,
  daysBack: number = 30
) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    const { data: integration } = await supabaseAdmin
      .from('project_integrations')
      .select('page_id, page_name, access_token')
      .eq('project_id', projectId)
      .single()

    if (!integration?.access_token) {
      return { success: false, error: 'No active Page Access Token found.' }
    }

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    // If specific formId not supplied, fetch all forms for this project
    let targetFormIds: string[] = []
    if (formId && formId !== 'all') {
      targetFormIds = [formId]
    } else {
      const { data: forms } = await supabaseAdmin
        .from('meta_forms')
        .select('form_id')
        .eq('project_id', projectId)
      targetFormIds = (forms || []).map(f => f.form_id)
    }

    if (targetFormIds.length === 0) {
      return { success: false, error: 'No lead forms found to sync. Please click "Refresh Forms from Meta" or add a Form ID manually.' }
    }

    let totalFetched = 0
    let totalInserted = 0

    for (const fid of targetFormIds) {
      const pullRes = await fetchHistoricalLeads(fid, integration.access_token, 100, daysBack)
      if (!pullRes.success) continue

      totalFetched += pullRes.leads.length

      for (const lead of pullRes.leads) {
        // Check if phone or lead already exists to prevent duplicate
        const { data: existing } = await supabaseAdmin
          .from('leads')
          .select('id')
          .or(`phone.eq.${lead.phoneNumber},source_page.ilike.%${lead.leadId}%`)
          .maybeSingle()

        if (!existing) {
          await supabaseAdmin
            .from('leads')
            .insert({
              name: lead.fullName,
              phone: lead.phoneNumber,
              email: lead.email || null,
              project: project?.name || integration.page_name,
              source_page: `meta_historical_${lead.leadId}`,
              form_id: fid,
              status: 'new',
              created_at: lead.createdTime || new Date().toISOString()
            })
          totalInserted += 1
        }
      }

      // Update leads_count on the form
      await supabaseAdmin
        .from('meta_forms')
        .update({ leads_count: pullRes.leads.length })
        .eq('form_id', fid)
    }

    revalidatePath('/crm/leads')
    revalidatePath('/crm/inbox')
    revalidatePath('/crm/projects')

    return {
      success: true,
      fetched: totalFetched,
      inserted: totalInserted,
      message: `Historical sync complete: Checked ${totalFetched} leads from the last ${daysBack} days (${totalInserted} new leads imported into CRM).`
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Historical lead sync failed' }
  }
}

/**
 * Disconnects Meta integration for a project
 */
export async function disconnectMetaIntegration(projectId: string) {
  try {
    await requireAdmin()
    const supabaseAdmin = createServiceClient()

    await supabaseAdmin
      .from('project_integrations')
      .delete()
      .eq('project_id', projectId)

    await supabaseAdmin
      .from('client_connect_tokens')
      .delete()
      .eq('project_id', projectId)

    // Mark forms as inactive
    await supabaseAdmin
      .from('meta_forms')
      .update({ is_active: false, status: 'DISCONNECTED' })
      .eq('project_id', projectId)

    revalidatePath('/crm/projects')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to disconnect integration' }
  }
}

/**
 * Public Verification: Used by the /connect/meta client onboarding page
 */
export async function verifyClientConnectToken(token: string) {
  try {
    const supabaseAdmin = createServiceClient()

    const { data: record, error } = await supabaseAdmin
      .from('client_connect_tokens')
      .select('id, project_id, expires_at, used_at, projects(id, name, client_name, location)')
      .eq('token', token)
      .single()

    if (error || !record) {
      return { valid: false, error: 'Invalid or unrecognized invitation link.' }
    }

    if (record.used_at) {
      return { valid: false, error: 'This invitation link has already been used. If you need to reconnect, please request a new link from your agency.' }
    }

    if (new Date(record.expires_at) < new Date()) {
      return { valid: false, error: 'This invitation link has expired (links are valid for 72 hours). Please request a fresh link.' }
    }

    const project: any = record.projects

    return {
      valid: true,
      tokenId: record.id,
      projectId: record.project_id,
      projectName: project?.name || 'Client Project',
      clientName: project?.client_name || 'Valued Client'
    }
  } catch (err: any) {
    return { valid: false, error: err.message || 'Verification failure' }
  }
}

/**
 * Completes client onboarding connection: saves page details, token, subscribes webhook, and auto-discovers forms
 */
export async function completeClientMetaConnection(params: {
  token: string
  pageId: string
  pageName: string
  accessToken: string
}) {
  try {
    const supabaseAdmin = createServiceClient()

    // 1. Verify token
    const { data: record, error: tokenErr } = await supabaseAdmin
      .from('client_connect_tokens')
      .select('id, project_id, projects(name)')
      .eq('token', params.token)
      .is('used_at', null)
      .single()

    if (tokenErr || !record) {
      return { success: false, error: 'Invalid or already consumed invitation token.' }
    }

    const projectId = record.project_id
    const projectName = (record.projects as any)?.name || params.pageName

    // 2. Subscribe page to leadgen webhook
    let webhookSubscribed = false
    try {
      const subRes = await subscribePageToLeadgenWebhook(params.pageId, params.accessToken)
      webhookSubscribed = subRes.success
    } catch (subErr) {
      console.warn('Webhook auto-subscription warning:', subErr)
    }

    // 3. Upsert into project_integrations
    const { error: intErr } = await supabaseAdmin
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        provider: 'meta',
        page_id: params.pageId,
        page_name: params.pageName,
        access_token: params.accessToken,
        token_type: 'page',
        is_connected: true,
        webhook_subscribed: webhookSubscribed,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id' })

    if (intErr) {
      return { success: false, error: `Failed to save integration: ${intErr.message}` }
    }

    // 4. Mark token as consumed
    await supabaseAdmin
      .from('client_connect_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', record.id)

    // 5. Auto-discover forms from Meta
    try {
      const formsRes = await fetchPageLeadForms(params.pageId, params.accessToken)
      if (formsRes.success && formsRes.forms.length > 0) {
        const payload = formsRes.forms.map(f => ({
          project_id: projectId,
          project_name: projectName,
          form_id: f.id,
          name: f.name,
          form_name: f.name,
          is_active: f.status === 'ACTIVE',
          status: f.status,
          leads_count: f.leads_count || 0
        }))

        await supabaseAdmin
          .from('meta_forms')
          .upsert(payload, { onConflict: 'form_id' })
      }
    } catch (fErr) {
      console.warn('Auto form discovery warning:', fErr)
    }

    revalidatePath('/crm/projects')
    revalidatePath('/crm/leads')

    return {
      success: true,
      pageName: params.pageName,
      webhookSubscribed
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to complete connection' }
  }
}
