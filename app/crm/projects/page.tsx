import React from 'react'
import { getProjectsWithFormCounts } from './actions'
import { ProjectsClient } from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const { data: projects } = await getProjectsWithFormCounts()

  return <ProjectsClient initialProjects={projects || []} />
}
