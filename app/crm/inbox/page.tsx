import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InboxDashboardClient from './InboxDashboardClient'
import { getInboxLeadsWithActivity, getInboxAnalytics, getInboxFilterOptions } from './actions'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Inbox | CRM',
  description: 'Incoming customer inquiries, form submissions, and messages',
}

export default async function InboxDashboardPage() {
  await requireAccess('inbox')
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
    getInboxLeadsWithActivity(1, 50),
    getInboxAnalytics(),
    getInboxFilterOptions()
  ])

  return (
    <InboxDashboardClient 
      initialLeads={initialLeads || []} 
      totalCount={totalCount || 0} 
      initialAnalytics={analytics}
      userRole={userRole} 
      projects={filterOptions.projects || []}
      forms={filterOptions.forms || []}
    />
  )
}
