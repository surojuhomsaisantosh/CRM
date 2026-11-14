import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WhatsappDashboardClient from './WhatsappDashboardClient'
import { getWhatsappLeadsWithActivity, getWhatsappAnalytics, getInboxFilterOptions } from './actions'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Inbox | CRM',
  description: 'Incoming customer inquiries, form submissions, and messages',
}

export default async function WhatsappDashboardPage() {
  await requireAccess('whatsapp')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/crm/login')
  }

  // Get user role from app_metadata if available, default to Admin
  const userRole = user.app_metadata?.role || 'Admin'

  const [
    { data: initialLeads, count: totalCount },
    analytics,
    filterOptions
  ] = await Promise.all([
    getWhatsappLeadsWithActivity(1, 50),
    getWhatsappAnalytics(),
    getInboxFilterOptions()
  ])

  return (
    <WhatsappDashboardClient 
      initialLeads={initialLeads || []} 
      totalCount={totalCount || 0} 
      initialAnalytics={analytics}
      userRole={userRole} 
      projects={filterOptions.projects || []}
      forms={filterOptions.forms || []}
    />
  )
}
