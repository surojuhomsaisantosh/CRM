'use client'

import React, { useState, useMemo } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ProjectRecord,
  createProject,
  updateProject,
  deleteProject
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

  // Open modal for editing existing project
  const handleOpenEdit = (p: ProjectRecord) => {
    setEditingProject(p)
    setName(p.name || '')
    setClientName(p.client_name || '')
    setLocation(p.location || '')
    setEmail(p.email || '')
    setPhoneNumbers(p.phone_numbers?.length ? [...p.phone_numbers] : [''])
    setIsModalOpen(true)
  }

  // Handle phone list mutations
  const handlePhoneChange = (index: number, val: string) => {
    const updated = [...phoneNumbers]
    updated[index] = val
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

  // Submit project form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !clientName.trim()) {
      toast.error('Project name and client name are required.')
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
          phone_numbers: phoneNumbers
        })
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('Project updated successfully.')
          setProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...res.data } : p))
          setIsModalOpen(false)
        }
      } else {
        const res = await createProject({
          name,
          client_name: clientName,
          location,
          email,
          phone_numbers: phoneNumbers
        })
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('Project created successfully.')
          setProjects([res.data, ...projects])
          setIsModalOpen(false)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete project
  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteProject(deletingId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Project removed.')
        setProjects(projects.filter(p => p.id !== deletingId))
        setDeletingId(null)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#e8ecf2] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#0f1d33] flex items-center justify-center text-[#c4a55a] shadow-xs">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0f1d33]">Projects Directory</h1>
              <p className="text-xs text-[#5a6a82]">Manage client accounts, projects, and connected lead capture forms</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 justify-center rounded-lg bg-[#0f1d33] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1a2d4c] transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4 text-[#c4a55a]" />
          Create Project
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#e8ecf2] shadow-xs">
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

        <div className="text-xs font-medium text-[#5a6a82] shrink-0 self-start sm:self-auto">
          Showing <span className="font-bold text-[#0f1d33]">{filteredProjects.length}</span> of {projects.length} projects
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-[#e8ecf2] shadow-xs overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#0f1d33]">No projects found</h3>
            <p className="text-xs text-[#5a6a82] mt-1">
              {searchQuery ? 'Try clearing your search query.' : 'Create your first project to start organizing clients and forms.'}
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
                  <th className="py-3 px-4">Location & Email</th>
                  <th className="py-3 px-4">Phone Numbers</th>
                  <th className="py-3 px-4">Forms Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3f7] text-xs">
                {filteredProjects.map((project, idx) => (
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
                        {project.email && (
                          <div className="flex items-center gap-1 text-[#5a6a82]">
                            <Mail className="h-3.5 w-3.5 text-[#5a6a82] shrink-0" />
                            <span>{project.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {project.phone_numbers && project.phone_numbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {project.phone_numbers.map((ph, pIdx) => (
                            <span
                              key={pIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f7f8fa] border border-[#e8ecf2] text-[11px] font-medium text-[#0f1d33]"
                            >
                              <Phone className="h-2.5 w-2.5 text-[#5a6a82]" />
                              {ph}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#94a3b8] italic">None added</span>
                      )}
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
                          className="p-1.5 text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] rounded-md transition-colors"
                          title="Edit Project"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(project.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-[#e8ecf2] my-8 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#e8ecf2] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#0f1d33] flex items-center justify-center text-[#c4a55a]">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f1d33]">
                    {editingProject ? 'Edit Project' : 'Create New Project'}
                  </h2>
                  <p className="text-xs text-[#5a6a82]">Specify client details and communication contact numbers</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#5a6a82] hover:text-[#0f1d33] p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0f1d33] mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Skyline Heights"
                    className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f1d33] mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Realty Group"
                    className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0f1d33] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f1d33] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@client.com"
                    className="w-full px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Phone Numbers (1 to 5) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#0f1d33]">
                    Phone Numbers <span className="text-[#5a6a82] font-normal">({phoneNumbers.length}/5)</span>
                  </label>
                  {phoneNumbers.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddPhone}
                      className="text-xs font-bold text-[#c4a55a] hover:text-[#a3843d] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Phone
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {phoneNumbers.map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#5a6a82] w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(idx, e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="flex-1 px-3 py-2 text-xs bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-[#0f1d33] focus:outline-none focus:border-[#0f1d33] focus:bg-white transition-all"
                      />
                      {phoneNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhone(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors shrink-0"
                          title="Remove phone number"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div
          onClick={() => setDeletingId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4 backdrop-blur-xs"
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
                className="px-3.5 py-1.5 text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
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
