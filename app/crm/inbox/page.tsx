import InboxDashboardClient from './InboxDashboardClient'
import { getInboxLeadsWithActivity, getInboxAnalytics, getInboxFilterOptions } from './actions'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Inbox | CRM',
  description: 'Incoming customer inquiries, form submissions, and messages',
}

export default async function InboxDashboardPage() {
  const { role: userRole } = await requireAccess('inbox')

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
