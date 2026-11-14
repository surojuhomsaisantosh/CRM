'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
}

export async function getProjectsWithFormCounts(): Promise<{ data: ProjectRecord[], error: string | null }> {
  try {
    const supabase = await createClient()

    // Fetch projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectsError) {
      // If table doesn't exist yet or has error, return empty gracefully
      console.warn('Projects table read notice:', projectsError.message)
      return { data: [], error: null }
    }

    // Fetch forms to compute active / inactive form counts per project
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

    const enriched = (projects || []).map((p: any) => {
      const counts = formsMap.get(p.id) || { active: 0, inactive: 0 }
      return {
        ...p,
        phone_numbers: Array.isArray(p.phone_numbers) ? p.phone_numbers : [],
        active_forms_count: counts.active,
        inactive_forms_count: counts.inactive,
        total_forms_count: counts.active + counts.inactive
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
    const supabase = await createClient()

    const name = formData.name?.trim()
    const client_name = formData.client_name?.trim()
    const location = formData.location?.trim() || ''
    const email = formData.email?.trim() || ''
    
    // Filter and sanitize phone numbers (up to 5)
    const phone_numbers = (formData.phone_numbers || [])
      .map(p => p.trim())
      .filter(Boolean)
      .slice(0, 5)

    if (!name) return { error: 'Project name is required' }
    if (!client_name) return { error: 'Client name is required' }

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
    const supabase = await createClient()

    const name = formData.name?.trim()
    const client_name = formData.client_name?.trim()
    const location = formData.location?.trim() || ''
    const email = formData.email?.trim() || ''
    const phone_numbers = (formData.phone_numbers || [])
      .map(p => p.trim())
      .filter(Boolean)
      .slice(0, 5)

    if (!name) return { error: 'Project name is required' }
    if (!client_name) return { error: 'Client name is required' }

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
