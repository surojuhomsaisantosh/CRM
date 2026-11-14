import { getLeads } from './actions'
import { getLeadStatuses } from '../modules/actions'
import LeadsClient from './LeadsClient'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const { role: userRole } = await requireAccess('leads')

  // Run independent database queries in parallel with Promise.all to minimize latency
  const [
    leadsRes,
    statusesRes
  ] = await Promise.all([
    getLeads(1, 50),
    getLeadStatuses()
  ])

  const initialLeads = leadsRes.data || []
  const totalCount = leadsRes.count || 0
  const leadStatuses = statusesRes.data || []

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
