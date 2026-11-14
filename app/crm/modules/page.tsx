import ModulesClient from './ModulesClient'
import { requireAccess } from '@/lib/auth/permissions'
import { getReportRecipients, getWaRecipients, getLeadStatuses, getAlertRecipients } from './actions'
import { getRoles, listAdminUsers } from '../users/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Modules & Feature Controls | CRM',
  description: 'Manage notification recipients, lead pipeline statuses, and access permissions',
}

export default async function ModulesPage() {
  await requireAccess('modules')
  const { data: initialRecipients } = await getReportRecipients()
  const { data: initialWaRecipients } = await getWaRecipients()
  const { data: initialLeadStatuses } = await getLeadStatuses()
  const { data: initialAlertRecipients } = await getAlertRecipients()
  const roles = await getRoles()
  const users = await listAdminUsers()

  return (
    <ModulesClient 
      initialRecipients={initialRecipients || []} 
      initialWaRecipients={initialWaRecipients || []}
      initialAlertRecipients={initialAlertRecipients || []}
      roles={roles.data || []}
      users={users.users || []}
      initialLeadStatuses={initialLeadStatuses || []}
    />
  )
}
