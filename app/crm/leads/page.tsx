import { getLeads } from './actions'
import { getLeadStatuses } from '../modules/actions'
import LeadsClient from './LeadsClient'
import { createClient } from '@/lib/supabase/server'
import { requireAccess } from '@/lib/auth/permissions'

export default async function LeadsPage() {
  await requireAccess('leads')
  const supabase = await createClient()

  // Run independent database queries in parallel with Promise.all to minimize latency
  const [
    leadsRes,
    statusesRes,
    userRes
  ] = await Promise.all([
    getLeads(1, 50),
    getLeadStatuses(),
    supabase.auth.getUser()
  ])

  const initialLeads = leadsRes.data || []
  const totalCount = leadsRes.count || 0
  const leadStatuses = statusesRes.data || []
  const userRole = userRes.data.user?.user_metadata?.role || 'Admin'

  return (
    <div className="w-full">
      <LeadsClient 
        initialLeads={initialLeads} 
        totalCount={totalCount} 
        userRole={userRole} 
        initialStatuses={leadStatuses}
      />
    </div>
  )
}
