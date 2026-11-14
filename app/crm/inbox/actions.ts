'use server'

import { createClient } from '@/lib/supabase/server'

export async function getInboxFilterOptions() {
  const supabase = await createClient()

  const [{ data: projects }, { data: forms }] = await Promise.all([
    supabase.from('projects').select('id, name, client_name').order('name', { ascending: true }),
    supabase.from('meta_forms').select('id, form_id, name, project_id, project_name').order('name', { ascending: true })
  ])

  return {
    projects: projects || [],
    forms: forms || []
  }
}

export async function getInboxLeadsWithActivity(
  page: number = 1,
  limit: number = 50,
  filters?: {
    project?: string,
    formId?: string
  }
) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  // Build query for inbox leads
  let query = supabase
    .from('leads')
    .select(`
      *,
      lead_activities (*)
    `, { count: 'exact' })

  // Apply project filter
  if (filters?.project && filters.project !== 'all') {
    query = query.eq('project', filters.project)
  }

  // Apply form filter (matches form_id column or source_page text)
  if (filters?.formId && filters.formId !== 'all') {
    query = query.or(`form_id.eq.${filters.formId},source_page.ilike.%${filters.formId}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching inbox leads:', error)
    return { data: [], count: 0, error: 'Failed to fetch inbox leads' }
  }

  // Ensure activities are ordered by created_at ascending (chronological) for each lead
  const formattedData = (data || []).map((lead: any) => {
    if (lead.lead_activities) {
      lead.lead_activities.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
    return lead
  })

  return { data: formattedData, count: count || 0, error: null }
}

export async function getInboxAnalytics() {
  const supabase = await createClient()
  
  // Get all leads to compute accurate analytics without pagination limits
  const { data, count } = await supabase
    .from('leads')
    .select(`
      id,
      lead_activities ( activity_type )
    `, { count: 'exact' })

  if (!data) return { totalLeads: 0, totalInteractions: 0, totalCallbacks: 0 }

  const totalInteractions = data.reduce((sum, lead) => sum + (lead.lead_activities?.length || 0), 0)
  const totalCallbacks = data.filter(lead => lead.lead_activities?.some((a: any) => a.activity_type === 'Requested Callback')).length

  return { totalLeads: count || 0, totalInteractions, totalCallbacks }
}

// Aliases for backwards compatibility
export const getWhatsappLeadsWithActivity = getInboxLeadsWithActivity
export const getWhatsappAnalytics = getInboxAnalytics
