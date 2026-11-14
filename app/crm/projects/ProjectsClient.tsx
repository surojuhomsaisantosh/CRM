'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  FileCheck2,
  FileX2,
  Trash2,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  RefreshCw,
  Activity,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Calendar,
  ChevronDown,
  Hash
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ProjectRecord,
  createProject,
  updateProject,
  deleteProject,
  generateClientConnectLink,
  checkMetaDiagnostics,
  syncProjectMetaForms,
  syncHistoricalMetaLeads,
  disconnectMetaIntegration,
  getProjectMetaForms,
  addManualMetaForm
} from './actions'

interface ProjectsClientProps {
  initialProjects: ProjectRecord[]
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([''])

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Meta Connect Link Modal State
  const [connectModalProject, setConnectModalProject] = useState<ProjectRecord | null>(null)
  const [generatedLinkData, setGeneratedLinkData] = useState<{
    connectUrl: string
    token: string
    expiresAt: string
  } | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  // Meta Diagnostics & Sync Drawer State
  const [diagnosticsProject, setDiagnosticsProject] = useState<ProjectRecord | null>(null)
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null)
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false)
  const [isSyncingForms, setIsSyncingForms] = useState(false)
  const [isSyncingLeads, setIsSyncingLeads] = useState(false)
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'forms' | 'guide'>('diagnostics')

  // Forms & Historical Sync State
  const [projectForms, setProjectForms] = useState<any[]>([])
  const [isLoadingForms, setIsLoadingForms] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState<string>('all')
  const [showManualFormInput, setShowManualFormInput] = useState(false)
  const [manualFormId, setManualFormId] = useState('')
  const [manualFormName, setManualFormName] = useState('')
  const [isAddingManualForm, setIsAddingManualForm] = useState(false)

  // Prevent background page from scrolling when any modal is active
  useEffect(() => {
    const isAnyModalOpen = Boolean(diagnosticsProject || connectModalProject || isModalOpen || deletingId)
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [diagnosticsProject, connectModalProject, isModalOpen, deletingId])

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const q = searchQuery.toLowerCase().trim()
    return projects.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(q)
      const matchClient = p.client_name?.toLowerCase().includes(q)
      const matchLoc = p.location?.toLowerCase().includes(q)
      const matchEmail = p.email?.toLowerCase().includes(q)
      const matchPhone = (p.phone_numbers || []).some((ph) => ph.toLowerCase().includes(q))
      return matchName || matchClient || matchLoc || matchEmail || matchPhone
    })
  }, [projects, searchQuery])

  // Open modal for new project
  const handleOpenCreate = () => {
    setEditingProject(null)
    setName('')
    setClientName('')
    setLocation('')
    setEmail('')
    setPhoneNumbers([''])
    setIsModalOpen(true)
  }

  // Open modal for editing project
  const handleOpenEdit = (project: ProjectRecord) => {
    setEditingProject(project)
    setName(project.name)
    setClientName(project.client_name)
    setLocation(project.location || '')
    setEmail(project.email || '')
    setPhoneNumbers(project.phone_numbers && project.phone_numbers.length > 0 ? [...project.phone_numbers] : [''])
    setIsModalOpen(true)
  }

  const handlePhoneChange = (index: number, val: string) => {
    // Only permit digits (0-9) and strictly limit to 10 digits
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10)
    const updated = [...phoneNumbers]
    updated[index] = digitsOnly
    setPhoneNumbers(updated)
  }

  const handleAddPhone = () => {
    if (phoneNumbers.length < 5) {
      setPhoneNumbers([...phoneNumbers, ''])
    }
  }

  const handleRemovePhone = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !clientName.trim()) {
      toast.error('Project Name and Client Name are required')
      return
    }

    // Clean and validate contact numbers
    const cleanedPhones = phoneNumbers
      .map((p) => p.replace(/\D/g, '').slice(0, 10))
      .filter(Boolean)

    for (const phone of cleanedPhones) {
      if (phone.length !== 10) {
        toast.error(`Phone number "${phone}" must be exactly 10 digits`)
        return
      }
    }

    if (cleanedPhones.length > 5) {
      toast.error('Maximum 5 contact numbers allowed')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingProject) {
        const res = await updateProject(editingProject.id, {
          name,
          client_name: clientName,
          location,
          email,
          phone_numbers: cleanedPhones
        })
        if (res.error) {
          toast.error(res.error)
        } else if (res.data) {
          toast.success('Project updated successfully')
          setProjects(projects.map((p) => (p.id === editingProject.id ? { ...p, ...res.data } : p)))
          setIsModalOpen(false)
        }
      } else {
        const res = await createProject({
          name,
          client_name: clientName,
          location,
          email,
          phone_numbers: cleanedPhones
        })
        if (res.error) {
          toast.error(res.error)
        } else if (res.data) {
          toast.success('Project created successfully')
          setProjects([res.data, ...projects])
          setIsModalOpen(false)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteProject(deletingId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Project deleted successfully')
        setProjects(projects.filter((p) => p.id !== deletingId))
        setDeletingId(null)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  // Generate Client Connect Link
  const handleOpenConnectModal = async (project: ProjectRecord) => {
    setConnectModalProject(project)
    setGeneratedLinkData(null)
    setIsGeneratingLink(true)

    const res = await generateClientConnectLink(project.id)
    setIsGeneratingLink(false)

    if (res.success && res.connectUrl) {
      setGeneratedLinkData({
        connectUrl: res.connectUrl,
        token: res.token!,
        expiresAt: res.expiresAt!
      })
    } else {
      toast.error(res.error || 'Failed to generate link')
    }
  }

  const handleCopyLink = () => {
    if (!generatedLinkData?.connectUrl) return
    navigator.clipboard.writeText(generatedLinkData.connectUrl)
    toast.success('Client onboarding link copied to clipboard!')
  }

  const handleShareWhatsApp = () => {
    if (!generatedLinkData?.connectUrl || !connectModalProject) return
    const msg = `Hi ${connectModalProject.client_name}, please click this link to connect your Facebook & Instagram ad forms for ${connectModalProject.name} with our CRM: ${generatedLinkData.connectUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Load project forms
  const loadProjectForms = async (projectId: string) => {
    setIsLoadingForms(true)
    const res = await getProjectMetaForms(projectId)
    setIsLoadingForms(false)
    if (res.success) {
      setProjectForms(res.forms || [])
    }
  }

  // Open Diagnostics Drawer
  const handleOpenDiagnostics = async (project: ProjectRecord) => {
    setDiagnosticsProject(project)
    setDiagnosticsData(null)
    setActiveTab('diagnostics')
    setIsLoadingDiagnostics(true)

    // Load diagnostics and forms simultaneously
    const [diagRes] = await Promise.all([
      checkMetaDiagnostics(project.id),
      loadProjectForms(project.id)
    ])

    setDiagnosticsData(diagRes)
    setIsLoadingDiagnostics(false)
  }

  // Refresh Forms from Meta
  const handleSyncForms = async () => {
    if (!diagnosticsProject) return
    setIsSyncingForms(true)
    const res = await syncProjectMetaForms(diagnosticsProject.id)
    setIsSyncingForms(false)

    if (res.success) {
      toast.success(`Discovered ${res.count} active lead forms from Facebook!`)
      await loadProjectForms(diagnosticsProject.id)
      // Refresh diagnostics
      const updated = await checkMetaDiagnostics(diagnosticsProject.id)
      setDiagnosticsData(updated)
    } else {
      toast.error(res.error || 'Failed to sync forms')
    }
  }

  // Pull Past Historical Leads for Fixed 30 Days Window
  const handleSyncPastLeads = async () => {
    if (!diagnosticsProject) return
    setIsSyncingLeads(true)
    const formIdToSync = selectedFormId === 'all' ? undefined : selectedFormId
    const res = await syncHistoricalMetaLeads(diagnosticsProject.id, formIdToSync, 30)
    setIsSyncingLeads(false)

    if (res.success) {
      toast.success(res.message || 'Historical leads imported successfully!')
      await loadProjectForms(diagnosticsProject.id)
      const updated = await checkMetaDiagnostics(diagnosticsProject.id)
      setDiagnosticsData(updated)
    } else {
      toast.error(res.error || 'Failed to pull historical leads')
    }
  }

  // Add Manual Meta Form ID
  const handleAddManualForm = async () => {
    if (!diagnosticsProject || !manualFormId.trim()) {
      toast.error('Please enter a valid Facebook Form ID')
      return
    }
    setIsAddingManualForm(true)
    const res = await addManualMetaForm(diagnosticsProject.id, manualFormId, manualFormName)
    setIsAddingManualForm(false)

    if (res.success) {
      toast.success('Form ID added and registered successfully!')
      setManualFormId('')
      setManualFormName('')
      setShowManualFormInput(false)
      setSelectedFormId(manualFormId.trim())
      await loadProjectForms(diagnosticsProject.id)
      const updated = await checkMetaDiagnostics(diagnosticsProject.id)
      setDiagnosticsData(updated)
    } else {
      toast.error(res.error || 'Failed to add manual form ID')
    }
  }

  // Disconnect Meta Integration
  const handleDisconnect = async () => {
    if (!diagnosticsProject) return
    if (!confirm('Are you sure you want to disconnect Meta integration for this client?')) return

    const res = await disconnectMetaIntegration(diagnosticsProject.id)
    if (res.success) {
      toast.success('Meta integration disconnected.')
      setDiagnosticsProject(null)
      // Update local state
      setProjects(projects.map(p => p.id === diagnosticsProject.id ? { ...p, meta_integration: undefined, invite_pending: false } : p))
    } else {
      toast.error(res.error || 'Failed to disconnect')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#e8ecf2] shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a82]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, client, or location..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] placeholder-[#5a6a82] focus:outline-none focus:border-[#0f1d33] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-[#5a6a82] shrink-0">
            Showing <span className="font-bold text-[#0f1d33]">{filteredProjects.length}</span> of {projects.length} clients
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0f1d33] hover:bg-[#1a2d4c] rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Client Project
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-[#e8ecf2] shadow-xs overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#0f1d33]">No projects found</h3>
            <p className="text-xs text-[#5a6a82] mt-1">
              {searchQuery ? 'Try clearing your search query.' : 'Create your first project to start onboarding clients and syncing ad forms.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0f1d33] bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg hover:bg-[#e8ecf2] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8ecf2] bg-[#f7f8fa] text-[11px] font-bold uppercase tracking-wider text-[#5a6a82]">
                  <th className="py-3 px-4">Sr. No</th>
                  <th className="py-3 px-4">Project & Client</th>
                  <th className="py-3 px-4">Meta Sync Status</th>
                  <th className="py-3 px-4">Location & Contacts</th>
                  <th className="py-3 px-4">Forms Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3f7] text-xs">
                {filteredProjects.map((project, idx) => {
                  const meta = project.meta_integration
                  const isConnected = meta?.is_connected
                  const isRevoked = meta?.token_status === 'revoked'

                  return (
                    <tr key={project.id} className="hover:bg-[#fbfcfd] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#5a6a82]">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0f1d33] text-sm">{project.name}</div>
                        <div className="text-[#5a6a82] text-xs flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3.5 w-3.5 text-[#c4a55a]" />
                          <span>Client: <strong className="text-[#1a2d4c]">{project.client_name}</strong></span>
                        </div>
                      </td>

                      {/* Meta Integration Status Column */}
                      <td className="py-3.5 px-4">
                        {isConnected ? (
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span>{meta.page_name || 'Page Connected'}</span>
                            </div>
                            <div>
                              <button
                                onClick={() => handleOpenDiagnostics(project)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0f1d33] hover:underline cursor-pointer"
                              >
                                <Activity className="w-3 h-3 text-[#5a6a82]" />
                                Diagnostics & Sync
                              </button>
                            </div>
                          </div>
                        ) : isRevoked ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              Token Revoked
                            </span>
                            <div>
                              <button
                                onClick={() => handleOpenConnectModal(project)}
                                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                              >
                                Reconnect Link &rarr;
                              </button>
                            </div>
                          </div>
                        ) : project.invite_pending ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Invite Pending
                            </span>
                            <div>
                              <button
                                onClick={() => handleOpenConnectModal(project)}
                                className="text-[11px] font-semibold text-[#5a6a82] hover:text-[#0f1d33] underline cursor-pointer"
                              >
                                View / Resend Link
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenConnectModal(project)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1877f2]/10 text-[#1877f2] hover:bg-[#1877f2] hover:text-white transition-all cursor-pointer border border-[#1877f2]/20 shadow-2xs"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Connect Meta
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {project.location ? (
                            <div className="flex items-center gap-1 text-[#0f1d33]">
                              <MapPin className="h-3.5 w-3.5 text-[#5a6a82] shrink-0" />
                              <span>{project.location}</span>
                            </div>
                          ) : (
                            <span className="text-[#94a3b8] italic">No location</span>
                          )}
                          {project.phone_numbers && project.phone_numbers[0] && (
                            <div className="flex items-center gap-1 text-[#5a6a82]">
                              <Phone className="h-3 w-3 text-[#5a6a82] shrink-0" />
                              <span>{project.phone_numbers[0]}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {project.active_forms_count || 0} Active
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <FileX2 className="h-3.5 w-3.5 text-slate-400" />
                            {project.inactive_forms_count || 0} Inactive
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(project)}
                            className="p-1.5 text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] rounded-md transition-colors cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(project.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Meta Connect & Invite Modal */}
      {connectModalProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConnectModalProject(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#e8ecf2] my-8 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-[#e8ecf2]">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1877f2] bg-[#1877f2]/10 px-2.5 py-0.5 rounded-full">
                  <LinkIcon className="w-3.5 h-3.5" /> Meta Client Onboarding
                </span>
                <h3 className="text-lg font-bold text-[#0f1d33]">
                  Connect Facebook Leads for {connectModalProject.name}
                </h3>
                <p className="text-xs text-[#5a6a82]">
                  Send this 1-click link to <strong>{connectModalProject.client_name}</strong> to authorize ad forms without sharing passwords.
                </p>
              </div>
              <button
                onClick={() => setConnectModalProject(null)}
                className="p-1.5 text-[#8a99ad] hover:text-[#0f1d33] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isGeneratingLink ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0f1d33]" />
                <p className="text-xs text-[#5a6a82]">Generating secure 72-hour invite token...</p>
              </div>
            ) : generatedLinkData ? (
              <div className="space-y-4">
                {/* Link Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0f1d33] uppercase tracking-wider">
                    Client Onboarding URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLinkData.connectUrl}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#0f1d33] text-white rounded-lg hover:bg-[#1a2d4c] transition-colors cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                  <p className="text-[11px] text-[#8a99ad]">
                    Valid for 72 hours &bull; Single-use token &bull; Never expires once client connects
                  </p>
                </div>

                {/* Instant Share Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share via WhatsApp
                  </button>
                  <a
                    href={`mailto:${connectModalProject.email || ''}?subject=Connect Facebook Leads for ${connectModalProject.name}&body=Hi ${connectModalProject.client_name}, please click this link to connect your Facebook page: ${generatedLinkData.connectUrl}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0f1d33] text-white text-xs font-bold hover:bg-[#1a2d4c] transition-colors shadow-2xs cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Share via Email
                  </a>
                </div>

                {/* How it works summary */}
                <div className="rounded-xl bg-[#f8fafc] border border-[#e8ecf2] p-4 text-xs text-[#5a6a82] space-y-2">
                  <h4 className="font-bold text-[#0f1d33]">What the client sees:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Client opens link and clicks <strong>"Connect with Facebook"</strong>.</li>
                    <li>They log into Facebook and pick their page (e.g. <em>{connectModalProject.name}</em>).</li>
                    <li>CRM server exchanges it for a <strong>permanent Page Access Token</strong>.</li>
                    <li>Active ad forms sync immediately; leads land in your CRM in real-time.</li>
                  </ol>
                </div>

                {/* Re-generate option */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenConnectModal(connectModalProject)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate Fresh Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectModalProject(null)}
                    className="px-4 py-1.5 text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 2. Meta Diagnostics & Form Sync Drawer */}
      {diagnosticsProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiagnosticsProject(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#e8ecf2] my-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#e8ecf2]">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#0f1d33]">
                  {diagnosticsProject.name} &bull; Meta Diagnostics
                </h3>
                <p className="text-xs text-[#5a6a82]">
                  Live health monitoring, automated webhook status, and form lead backfilling.
                </p>
              </div>
              <button
                onClick={() => setDiagnosticsProject(null)}
                className="p-1.5 text-[#8a99ad] hover:text-[#0f1d33] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#e8ecf2] pb-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('diagnostics')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'diagnostics' ? 'bg-[#0f1d33] text-white' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'
                }`}
              >
                Live Diagnostics & Troubleshooter
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forms')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'forms' ? 'bg-[#0f1d33] text-white' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'
                }`}
              >
                Lead Forms & Historical Pull
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'guide' ? 'bg-[#0f1d33] text-white' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'
                }`}
              >
                Agency Troubleshooting Guide
              </button>
            </div>

            {isLoadingDiagnostics ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#0f1d33]" />
                <p className="text-xs text-[#5a6a82]">Running 4-point Meta Graph API diagnostic check...</p>
              </div>
            ) : (
              <div>
                {/* TAB 1: DIAGNOSTICS */}
                {activeTab === 'diagnostics' && diagnosticsData && (
                  <div className="space-y-4">
                    {/* Status Alert */}
                    {diagnosticsData.tokenStatus === 'revoked' ? (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span>Facebook Access Token Has Been Revoked</span>
                        </div>
                        <p className="text-xs text-red-600 leading-relaxed">
                          Leads are temporarily paused. This most commonly occurs if <strong>{diagnosticsProject.client_name}</strong> changed their Facebook account password or removed app permissions.
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDiagnosticsProject(null)
                              handleOpenConnectModal(diagnosticsProject)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                          >
                            Generate Re-Connect Link Now &rarr;
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-green-900">Integration Healthy & Active</h4>
                            <p className="text-xs text-green-700">
                              Connected to <strong>{diagnosticsData.pageName}</strong> &bull; Token has no expiration date.
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-green-800 bg-green-200/60 px-2.5 py-1 rounded-md">
                          Live Sync
                        </span>
                      </div>
                    )}

                    {/* 4-Point Check List */}
                    <div className="rounded-xl border border-[#e8ecf2] divide-y divide-[#f0f3f7] overflow-hidden bg-white">
                      {(diagnosticsData.diagnostics || []).map((check: any, cIdx: number) => (
                        <div key={cIdx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            {check.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-[#0f1d33]">{check.check}</div>
                              <div className="text-[11px] text-[#5a6a82]">{check.detail}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            check.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {check.passed ? 'Passed' : 'Action Required'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3">
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                      >
                        Disconnect Integration
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDiagnostics(diagnosticsProject)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0f1d33] bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg hover:bg-[#e8ecf2] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-check Diagnostics
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: FORMS & HISTORICAL PULL */}
                {activeTab === 'forms' && (
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#0f1d33] flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#1877f2]" />
                          Active Lead Gen Forms & Historical Pull
                        </h4>
                        <p className="text-xs text-[#5a6a82]">
                          Manage Facebook & Instagram forms, select date ranges, and pull past leads directly into CRM.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSyncingForms}
                        onClick={handleSyncForms}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0f1d33] rounded-lg hover:bg-[#1a2d4c] transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                      >
                        {isSyncingForms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh Forms from Meta
                      </button>
                    </div>

                    {/* Historical Lead Sync Card - Fixed 30 Days Engine */}
                    <div className="rounded-xl border border-[#c7d9f8] bg-gradient-to-br from-[#f0f6ff] to-[#f8fafd] p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1877f2]">
                            <Sparkles className="w-4 h-4" />
                            <span>Historical Lead Ingestion Engine</span>
                          </div>
                          <p className="text-xs text-[#475569]">
                            Pull past leads submitted over the last 30 days that arrived before webhook synchronization.
                          </p>
                        </div>
                      </div>

                      {/* Single Form Dropdown Selector with Fixed 30 Days Badge */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#0f1d33] uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#1877f2]" />
                            Target Lead Form
                          </label>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#1877f2] border border-blue-200">
                            <Calendar className="w-3 h-3" />
                            Fixed Window: Last 30 Days
                          </span>
                        </div>
                        <select
                          value={selectedFormId}
                          onChange={(e) => setSelectedFormId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#cbd5e1] rounded-lg text-[#0f1d33] font-medium focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] cursor-pointer"
                        >
                          <option value="all">
                            ⚡ All Active Forms ({projectForms.length} synced)
                          </option>
                          {projectForms.map((f) => (
                            <option key={f.form_id} value={f.form_id}>
                              {f.form_name || f.name || f.form_id} (ID: {f.form_id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Pull Action Button */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#dbe6f8]">
                        <p className="text-[11px] text-[#64748b]">
                          Duplicates are skipped automatically based on lead phone numbers and Meta Lead IDs.
                        </p>
                        <button
                          type="button"
                          disabled={isSyncingLeads || (projectForms.length === 0 && selectedFormId === 'all')}
                          onClick={handleSyncPastLeads}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1877f2] hover:bg-[#166fe5] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {isSyncingLeads ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Pulling Leads from Meta...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Pull Past Leads (Last 30 Days)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Forms Table / Cards */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-[#0f1d33] uppercase tracking-wider">
                          Discovered Forms ({projectForms.length})
                        </h5>
                        <button
                          type="button"
                          onClick={() => setShowManualFormInput(!showManualFormInput)}
                          className="text-xs font-semibold text-[#1877f2] hover:underline cursor-pointer"
                        >
                          {showManualFormInput ? 'Cancel Manual Add' : '+ Add Form ID Manually'}
                        </button>
                      </div>

                      {/* Manual Form Input Drawer */}
                      {showManualFormInput && (
                        <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-3">
                          <p className="text-xs text-[#475569]">
                            If your client gave you a specific Form ID from Meta Ads Manager, enter it below to register it:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={manualFormId}
                              onChange={(e) => setManualFormId(e.target.value)}
                              placeholder="Facebook Form ID (e.g. 192837465019283)"
                              className="px-3 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33]"
                            />
                            <input
                              type="text"
                              value={manualFormName}
                              onChange={(e) => setManualFormName(e.target.value)}
                              placeholder="Form Label (e.g. 3BHK Luxury Inquiry)"
                              className="px-3 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33]"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowManualFormInput(false)}
                              className="px-3 py-1 text-xs text-[#64748b] hover:text-[#0f1d33]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isAddingManualForm || !manualFormId.trim()}
                              onClick={handleAddManualForm}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#0f1d33] rounded-lg hover:bg-[#1a2d4c] disabled:opacity-50 cursor-pointer"
                            >
                              {isAddingManualForm ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              Save & Register Form
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Forms List */}
                      {isLoadingForms ? (
                        <div className="py-8 text-center text-xs text-[#64748b] flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-[#0f1d33]" />
                          <span>Loading active forms...</span>
                        </div>
                      ) : projectForms.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#cbd5e1] p-6 text-center space-y-2">
                          <div className="w-9 h-9 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto text-[#64748b]">
                            <Layers className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-[#0f1d33]">No lead forms discovered yet</p>
                          <p className="text-[11px] text-[#64748b] max-w-sm mx-auto">
                            Click <strong>"Refresh Forms from Meta"</strong> above to auto-detect forms from the connected page, or add your Form ID manually.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectForms.map((form) => (
                            <div
                              key={form.form_id}
                              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                                selectedFormId === form.form_id
                                  ? 'border-[#1877f2] bg-[#f0f6ff]/40 shadow-xs'
                                  : 'border-[#e8ecf2] bg-white hover:bg-[#fbfcfd]'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#0f1d33]">
                                    {form.form_name || form.name || 'Meta Ad Form'}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {form.status || 'ACTIVE'}
                                  </span>
                                  {selectedFormId === form.form_id && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1877f2] text-white">
                                      Selected for Pull
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-[#64748b]">
                                  <span className="font-mono">ID: {form.form_id}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(form.form_id)
                                      toast.success('Form ID copied!')
                                    }}
                                    className="hover:text-[#0f1d33] cursor-pointer"
                                    title="Copy Form ID"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  {typeof form.leads_count === 'number' && (
                                    <span>&bull; {form.leads_count} leads pulled</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFormId(form.form_id)
                                    toast.info(`Selected "${form.form_name || form.form_id}" for historical pull`)
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#0f1d33] bg-[#f1f5f9] hover:bg-[#e2e8f0] rounded-lg transition-colors cursor-pointer"
                                >
                                  Select Form
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: GUIDE */}
                {activeTab === 'guide' && (
                  <div className="space-y-4 text-xs text-[#5a6a82] leading-relaxed">
                    <div className="rounded-xl bg-[#f8fafc] border border-[#e8ecf2] p-4 space-y-3">
                      <h4 className="text-sm font-bold text-[#0f1d33]">Agency Owner Troubleshooting Checklist:</h4>
                      
                      <div className="space-y-2">
                        <div>
                          <strong className="text-[#0f1d33]">1. Why didn't leads appear when I entered Form ID?</strong>
                          <p className="text-[11px]">
                            Form IDs only identify incoming webhooks. Meta will not send leads until Alice authorizes your app through the 1-click connect link.
                          </p>
                        </div>

                        <div>
                          <strong className="text-[#0f1d33]">2. What if Alice changed her Facebook password?</strong>
                          <p className="text-[11px]">
                            Facebook security immediately revokes the token. The CRM will show a red "Token Revoked" badge. Simply click "Reconnect Link" and send Alice the link; it takes her 5 seconds to re-approve.
                          </p>
                        </div>

                        <div>
                          <strong className="text-[#0f1d33]">3. Why are tokens permanent?</strong>
                          <p className="text-[11px]">
                            Our backend executes a 2-step token exchange converting the temporary login into a permanent Page Access Token with <code>expires_at: 0</code>. It never expires on a calendar clock.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Create / Edit Project Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4 backdrop-blur-xs overflow-y-auto overscroll-contain"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-[#e8ecf2] my-8 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#e8ecf2] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#0f1d33] flex items-center justify-center text-[#c4a55a]">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0f1d33]">
                  {editingProject ? 'Edit Project' : 'Create New Client Project'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#5a6a82] hover:text-[#0f1d33] p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f1d33]">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice Real Estate, Godrej Lakeside"
                  className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f1d33]">Client Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Alice Sharma, Prestige Group"
                  className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f1d33]">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, Mumbai"
                  className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f1d33]">Primary Contact Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@company.com"
                  className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                />
              </div>

              {/* Phone Numbers */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-[#0f1d33]">Contact Numbers (Max 5)</label>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#5a6a82]">
                      {phoneNumbers.length}/5
                    </span>
                  </div>
                  {phoneNumbers.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddPhone}
                      className="text-[11px] font-semibold text-[#0f1d33] hover:underline cursor-pointer"
                    >
                      + Add Phone
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {phoneNumbers.map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#5a6a82] w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                          placeholder="Enter 10-digit mobile number"
                          className="w-full px-3 py-2 pr-12 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all font-mono"
                        />
                        {phone.length > 0 && (
                          <span
                            className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono ${
                              phone.length === 10 ? 'text-emerald-600' : 'text-[#8a99ad]'
                            }`}
                          >
                            {phone.length}/10
                          </span>
                        )}
                      </div>
                      {phoneNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhone(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer"
                          title="Remove phone number"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#8a99ad]">
                  Only numbers (0-9) allowed. Each contact number must be exactly 10 digits.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e8ecf2] mt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0f1d33] hover:bg-[#1a2d4c] rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {deletingId && (
        <div
          onClick={() => setDeletingId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4 backdrop-blur-xs overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-[#e8ecf2]"
          >
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0f1d33]">Delete Project?</h3>
                <p className="text-xs text-[#5a6a82]">This will remove the project from the directory.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
