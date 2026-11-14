'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Inbox, 
  Download, 
  X, 
  ArrowRight, 
  Clock, 
  MessageSquare, 
  Phone, 
  Mail, 
  Building, 
  FileText,
  FolderKanban,
  ChevronDown,
  FilterX
} from 'lucide-react'
import { getInboxLeadsWithActivity } from './actions'

export interface InboxProject {
  id: string
  name: string
  client_name?: string
}

export interface InboxForm {
  id: string
  form_id: string
  name: string
  project_id?: string
  project_name?: string
}

const extractIncomingMessage = (details: string) => {
  if (!details) return '(no text content)';
  
  const lines = details.split('\n');
  const msgLine = lines.find(l => l.startsWith('Message: '));
  
  if (msgLine) {
    let msg = msgLine.replace('Message: ', '').trim();
    if (msg.startsWith('"') && msg.endsWith('"')) {
      msg = msg.slice(1, -1);
    }
    if (msg && msg !== '(no text content)') {
      return msg;
    }
  }

  // Fallback for historical/interactive/ad records where Message was logged as '(no text content)'
  const selectionLine = lines.find(l => l.startsWith('Selection: '));
  if (selectionLine) {
    const rawSelection = selectionLine.replace('Selection: ', '').trim();
    const cleaned = rawSelection.replace(/^(area_|proj_|action_)/, '').replace(/_/g, ' ');
    if (cleaned) return `Selected: ${cleaned}`;
  }

  const referralTypeLine = lines.find(l => l.startsWith('WhatsApp referral source type: '));
  const ctwaLine = lines.find(l => l.startsWith('Click-to-WhatsApp ID: '));
  if (referralTypeLine || ctwaLine) {
    return 'Ad Interaction (Click-to-WhatsApp)';
  }

  const typeLine = lines.find(l => l.startsWith('Type: '));
  if (typeLine) {
    const typeVal = typeLine.replace('Type: ', '').trim().toLowerCase();
    if (typeVal === 'unsupported') {
      const isReferral = lines.some(l => l.includes('referral') || l.includes('Click-to-WhatsApp'));
      return isReferral ? 'Ad Interaction (Click-to-WhatsApp)' : 'Chat Initiated (Ad CTA / Interactive Button)';
    }
    if (typeVal && typeVal !== 'text') {
      return `[${typeVal.charAt(0).toUpperCase() + typeVal.slice(1)} message]`;
    }
  }

  return msgLine ? '(no text content)' : details.trim() || '(no text content)';
};

const extractMediaInfo = (details: string) => {
  if (!details) return null;
  const lines = details.split('\n');
  const mediaLine = lines.find(l => l.startsWith('Media ID: '));
  const typeLine = lines.find(l => l.startsWith('Type: '));
  const mimeLine = lines.find(l => l.startsWith('MIME: '));
  if (!mediaLine) return null;
  const mediaId = mediaLine.replace('Media ID: ', '').trim();
  const type = typeLine ? typeLine.replace('Type: ', '').trim().toLowerCase() : '';
  const mime = mimeLine ? mimeLine.replace('MIME: ', '').trim().toLowerCase() : '';
  return { mediaId, type, mime };
};

const extractFormDetails = (lead: any) => {
  const source = lead.source_page || '';
  if (lead.form_id || lead.form_name) {
    return {
      name: lead.form_name || '-',
      id: lead.form_id || '-'
    };
  }
  if (source.includes('Meta:')) {
    const raw = source.replace(/.*Meta:\s*/, '').trim();
    const match = raw.match(/^(.*?)\s*\((.*?)\)/);
    if (match) {
      return {
        name: match[1].trim(),
        id: match[2].trim()
      };
    }
    return {
      name: raw,
      id: '-'
    };
  }
  const genericMatch = source.match(/^(.*?)\s*\(([0-9]+)\)/);
  if (genericMatch) {
    return {
      name: genericMatch[1].trim(),
      id: genericMatch[2].trim()
    };
  }
  if (source && source !== 'contact') {
    return {
      name: source,
      id: '-'
    };
  }
  return {
    name: source || '-',
    id: '-'
  };
};

const extractLeadMessageText = (lead: any) => {
  if (lead.message && lead.message.trim() && lead.message !== '(no text content)') {
    return lead.message.trim();
  }
  const activities = lead.lead_activities || [];
  if (activities.length > 0) {
    for (let i = activities.length - 1; i >= 0; i--) {
      const desc = activities[i].description;
      if (desc) {
        const parsed = extractIncomingMessage(desc);
        if (parsed && parsed !== '(no text content)') {
          return parsed;
        }
      }
    }
  }
  return '-';
};

export default function InboxDashboardClient({ 
  initialLeads, 
  totalCount = 0, 
  userRole,
  projects = [],
  forms = []
}: { 
  initialLeads: any[], 
  totalCount?: number, 
  initialAnalytics?: any,
  userRole: string,
  projects?: InboxProject[],
  forms?: InboxForm[]
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  
  // Filter States
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedForm, setSelectedForm] = useState<string>('all')

  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeadsCount, setTotalLeadsCount] = useState(totalCount || initialLeads.length)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const isPageLoadingRef = useRef(false)
  const pageSize = 50
  
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Dynamic available forms list
  const availableForms = useMemo(() => {
    const map = new Map<string, { id: string; form_id: string; name: string; project_name?: string }>();
    
    // 1. Registered forms from meta_forms
    forms.forEach(f => {
      if (f.form_id) {
        map.set(f.form_id, {
          id: f.id,
          form_id: f.form_id,
          name: f.name || `Form ${f.form_id}`,
          project_name: f.project_name
        });
      }
    });

    // 2. Any additional form IDs found in leads
    leads.forEach(l => {
      const fInfo = extractFormDetails(l);
      if (fInfo.id && fInfo.id !== '-' && !map.has(fInfo.id)) {
        map.set(fInfo.id, {
          id: fInfo.id,
          form_id: fInfo.id,
          name: fInfo.name !== '-' ? fInfo.name : `Form ${fInfo.id}`,
          project_name: l.project || l.property_interest
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [forms, leads]);

  // Filter forms based on selected project
  const filteredForms = useMemo(() => {
    if (selectedProject === 'all') return availableForms;
    return availableForms.filter(f => 
      !f.project_name || f.project_name.toLowerCase() === selectedProject.toLowerCase()
    );
  }, [availableForms, selectedProject]);

  const applyFilters = async (project: string, formId: string) => {
    setIsPageLoading(true);
    isPageLoadingRef.current = true;
    try {
      const res = await getInboxLeadsWithActivity(1, pageSize, {
        project: project !== 'all' ? project : undefined,
        formId: formId !== 'all' ? formId : undefined
      });
      setLeads(res.data || []);
      setTotalLeadsCount(res.count || 0);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error filtering inbox leads:', err);
    } finally {
      isPageLoadingRef.current = false;
      setIsPageLoading(false);
    }
  };

  const handleProjectChange = (newProject: string) => {
    setSelectedProject(newProject);
    let newForm = selectedForm;
    if (newProject !== 'all' && selectedForm !== 'all') {
      const formMatches = availableForms.some(
        f => f.form_id === selectedForm && (!f.project_name || f.project_name.toLowerCase() === newProject.toLowerCase())
      );
      if (!formMatches) {
        newForm = 'all';
        setSelectedForm('all');
      }
    }
    applyFilters(newProject, newForm);
  };

  const handleFormChange = (newForm: string) => {
    setSelectedForm(newForm);
    applyFilters(selectedProject, newForm);
  };

  const handleClearFilters = () => {
    setSelectedProject('all');
    setSelectedForm('all');
    applyFilters('all', 'all');
  };

  useEffect(() => {
    if (selectedLead && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      const rafId = requestAnimationFrame(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
        }
      })
      return () => cancelAnimationFrame(rafId)
    }
  }, [selectedLead])

  // Escape key dismiss & body scroll lock for panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLead) {
        setSelectedLead(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLead])

  useEffect(() => {
    if (selectedLead) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [selectedLead])

  const handlePageChange = async (newPage: number) => {
    if (isPageLoadingRef.current) return;
    if (newPage < 1 || newPage > Math.ceil(totalLeadsCount / pageSize)) return;
    isPageLoadingRef.current = true;
    setIsPageLoading(true);
    try {
      const res = await getInboxLeadsWithActivity(newPage, pageSize, {
        project: selectedProject !== 'all' ? selectedProject : undefined,
        formId: selectedForm !== 'all' ? selectedForm : undefined
      });
      setLeads(res.data || []);
      setTotalLeadsCount(res.count || 0);
      setCurrentPage(newPage);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      isPageLoadingRef.current = false;
      setIsPageLoading(false);
    }
  };

  // Process leads for the table
  const processedLeads = useMemo(() => {
    return leads.map(lead => {
      const activities = lead.lead_activities || [];
      const formInfo = extractFormDetails(lead);
      const messageText = extractLeadMessageText(lead);
      const lastActive = activities.length > 0 ? activities[activities.length - 1].created_at : (lead.created_at || lead.updated_at);

      return {
        ...lead,
        formId: formInfo.id,
        formName: formInfo.name,
        messageText,
        lastActive
      };
    }).sort((a, b) => new Date(b.lastActive || b.created_at).getTime() - new Date(a.lastActive || a.created_at).getTime());
  }, [leads]);

  const exportToCSV = () => {
    const headers = ['Sr. No', 'Name', 'Phone', 'Email', 'Project', 'Form ID', 'Form Name', 'Message', 'Date'];
    const csvContent = [
      headers.join(','),
      ...processedLeads.map((lead, index) => [
        (currentPage - 1) * pageSize + index + 1,
        `"${(lead.name || '').replace(/"/g, '""')}"`,
        `"${(lead.phone || '').replace(/"/g, '""')}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.project || lead.property_interest || '-').replace(/"/g, '""')}"`,
        `"${(lead.formId || '-').replace(/"/g, '""')}"`,
        `"${(lead.formName || '-').replace(/"/g, '""')}"`,
        `"${(lead.messageText || '-').replace(/"/g, '""')}"`,
        `"${new Date(lead.lastActive).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inbox_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f7f8fa] overflow-y-auto md:overflow-hidden md:h-full">
      {/* Header Bar */}
      <div className="p-4 md:p-8 pb-4 md:pb-5 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0f1d33] flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0f1d33] flex items-center justify-center text-white shadow-xs">
                <Inbox className="h-5 w-5 text-white" />
              </div>
              Inbox
            </h1>
            <p className="text-xs sm:text-sm text-[#5a6a82] mt-1">
              Incoming customer inquiries, messages, and form submissions.
            </p>
          </div>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 bg-[#0f1d33] hover:bg-[#1e3a5f] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98] shrink-0"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Main Inbox Table Container */}
      <div className="flex-1 px-4 md:px-8 pb-4 md:pb-8 flex flex-col min-h-0">
        {/* Filter Bar (Reference from Lead Pipeline) */}
        <div className="bg-white rounded-xl border border-[#e8ecf2] p-4 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Select Project Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5a6a82] shrink-0 whitespace-nowrap select-none flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#c4a55a]" />
                Project:
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedProject}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="appearance-none text-xs font-semibold bg-[#f3f5f8] border border-[#e8ecf2] text-[#0f1d33] rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0f1d33] cursor-pointer hover:bg-[#e8ecf2] transition-colors"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.client_name ? `(${p.client_name})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#5a6a82] absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-[#e8ecf2]" />

            {/* Select Form Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5a6a82] shrink-0 whitespace-nowrap select-none flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1e3a5f]" />
                Form:
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedForm}
                  onChange={(e) => handleFormChange(e.target.value)}
                  className="appearance-none text-xs font-semibold bg-[#f3f5f8] border border-[#e8ecf2] text-[#0f1d33] rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0f1d33] cursor-pointer hover:bg-[#e8ecf2] transition-colors max-w-[240px] truncate"
                >
                  <option value="all">All Forms</option>
                  {filteredForms.map((f) => (
                    <option key={f.id || f.form_id} value={f.form_id}>
                      {f.name} {f.form_id ? `(${f.form_id})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#5a6a82] absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedProject !== 'all' || selectedForm !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
                title="Reset project and form filters"
              >
                <FilterX className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Showing X inquiries badge */}
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5a6a82] bg-[#f8fafc] px-3.5 py-2 rounded-lg border border-[#e8ecf2] shrink-0 self-start md:self-auto ml-auto">
            <span>Showing</span>
            <span className="font-bold text-[#0f1d33]">{totalLeadsCount}</span>
            <span>{totalLeadsCount === 1 ? 'inbox inquiry' : 'inbox inquiries'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e8ecf2] shadow-xs flex flex-col md:overflow-hidden h-auto md:h-full">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-auto">
            <table className="w-full text-left text-xs text-[#5a6a82] relative">
              <thead className="bg-[#f3f5f8] text-xs uppercase font-semibold text-[#1e3a5f] sticky top-0 z-10 border-b border-[#e8ecf2]">
                <tr>
                  <th className="px-4 py-3 w-20 whitespace-nowrap text-[#1e3a5f]">Sr. No</th>
                  <th className="px-4 py-3 w-72">Lead Info</th>
                  <th className="px-4 py-3 w-52">Project</th>
                  <th className="px-4 py-3 w-64">Form ID & Form Name</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {processedLeads.length > 0 ? (
                  processedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#f8fafc] transition-colors">
                      {/* Sr. No */}
                      <td className="px-4 py-3 text-[#5a6a82] font-semibold whitespace-nowrap">
                        {(currentPage - 1) * pageSize + processedLeads.indexOf(lead) + 1}
                      </td>

                      {/* Lead Info */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-[#0f1d33]">{lead.name || 'Anonymous Lead'}</div>
                        <div className="flex items-center gap-1.5 text-xs text-[#5a6a82] mt-0.5">
                          <Phone className="h-3 w-3 text-[#8a99ad] shrink-0" />
                          <span>{lead.phone || '-'}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#8a99ad] truncate mt-0.5 max-w-[240px]" title={lead.email}>
                            <Mail className="h-3 w-3 text-[#8a99ad] shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3">
                        {lead.project || lead.property_interest ? (
                          <div className="inline-flex items-center gap-1.5 font-medium text-[#0f1d33] bg-[#f8fafc] px-2.5 py-1 rounded-lg border border-[#e8ecf2]">
                            <Building className="h-3.5 w-3.5 text-[#5a6a82] shrink-0" />
                            <span className="truncate max-w-[180px]">{lead.project || lead.property_interest}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>

                      {/* Form ID & Form Name */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f1d33]">
                            <FileText className="h-3 w-3 text-[#5a6a82] shrink-0" />
                            <span className="truncate max-w-[200px]" title={lead.formName}>{lead.formName !== '-' ? lead.formName : 'Direct Inquiry'}</span>
                          </span>
                          {lead.formId && lead.formId !== '-' && (
                            <span className="text-[10px] font-mono text-[#5a6a82] bg-[#eef2f6] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                              ID: {lead.formId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Message */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-[#334155] leading-relaxed max-w-lg line-clamp-2" title={lead.messageText}>
                          {lead.messageText}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1.5 bg-[#f1f4f8] hover:bg-[#0f1d33] text-[#0f1d33] hover:text-white px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shrink-0"
                          title="View activity history"
                        >
                          <span>History</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#5a6a82]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="h-8 w-8 text-[#8a99ad]" />
                        <span className="font-medium text-sm">No inbox messages found.</span>
                        <p className="text-xs text-[#8a99ad]">Incoming leads and inquiries will appear here automatically.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-[#e8ecf2]">
            {processedLeads.length > 0 ? (
              processedLeads.map((lead) => (
                <div key={`mobile-lead-${lead.id}`} className="p-4 flex flex-col gap-3 hover:bg-[#f8fafc] transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#5a6a82] bg-[#f1f4f8] px-2 py-0.5 rounded">
                          #{(currentPage - 1) * pageSize + processedLeads.indexOf(lead) + 1}
                        </span>
                        <div className="font-semibold text-[#0f1d33] text-base">{lead.name || 'Anonymous Lead'}</div>
                      </div>
                      <div className="text-xs text-[#5a6a82] mt-1 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-[#8a99ad]" />
                        {lead.phone || '-'}
                      </div>
                      {lead.email && (
                        <div className="text-xs text-[#8a99ad] mt-0.5 flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-[#8a99ad]" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project & Form Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[11px] font-medium text-[#8a99ad] block mb-0.5">Project</span>
                      <span className="font-semibold text-[#0f1d33] truncate block">
                        {lead.project || lead.property_interest || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[#8a99ad] block mb-0.5">Form ID & Name</span>
                      <div className="truncate">
                        <span className="font-semibold text-[#0f1d33] block truncate">{lead.formName || '-'}</span>
                        {lead.formId && lead.formId !== '-' && (
                          <span className="text-[10px] font-mono text-[#5a6a82] bg-[#eef2f6] px-1 rounded">
                            ID: {lead.formId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="bg-[#f8fafc] p-2.5 rounded-lg border border-[#e8ecf2] mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a99ad] block mb-1">Message</span>
                    <p className="text-xs text-[#334155] leading-relaxed line-clamp-3">
                      {lead.messageText}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="inline-flex items-center gap-1.5 bg-[#0f1d33] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <span>View History</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#5a6a82]">
                <Inbox className="h-8 w-8 text-[#8a99ad] mx-auto mb-2" />
                <span className="font-medium text-sm">No inbox messages found.</span>
              </div>
            )}
          </div>

          {/* Pagination UI */}
          {totalLeadsCount > pageSize && (
            <div className="flex items-center justify-between border-t border-[#e8ecf2] bg-white px-4 py-3 sm:px-6 mt-auto shrink-0">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPageLoading}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage * pageSize >= totalLeadsCount || isPageLoading}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalLeadsCount)}</span> of{' '}
                    <span className="font-medium">{totalLeadsCount}</span> results
                    {isPageLoading && <span className="ml-2 text-[#0f1d33] font-medium">Loading...</span>}
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isPageLoading}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-black ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none focus:z-20 focus:outline-offset-0"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage * pageSize >= totalLeadsCount || isPageLoading}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-black ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none focus:z-20 focus:outline-offset-0"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel for Detailed History */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#0f1d33]/40" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#e8ecf2] transform-gpu will-change-transform animate-in slide-in-from-right duration-300">
            
            <div className="flex items-center justify-between p-6 border-b border-[#e8ecf2] bg-[#f3f5f8]">
              <div className="flex items-center gap-3">
                <div className="bg-[#0f1d33] p-2.5 rounded-xl text-white">
                  <Inbox className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0f1d33]">Message & Activity Log</h2>
                  <p className="text-xs text-[#5a6a82]">{selectedLead.name} ({selectedLead.phone || '-'})</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-2 text-[#5a6a82] hover:text-[#0f1d33] hover:bg-white rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 bg-[#f8fafc] flex flex-col relative overscroll-contain">
              <div className="relative z-10 flex flex-col gap-3 pb-4">
                {/* Lead Overview Card */}
                <div className="bg-white p-3.5 rounded-xl border border-[#e8ecf2] shadow-xs text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[#5a6a82]">
                    <span>Project:</span>
                    <span className="font-semibold text-[#0f1d33]">{selectedLead.project || selectedLead.property_interest || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#5a6a82]">
                    <span>Form Name:</span>
                    <span className="font-semibold text-[#0f1d33]">{selectedLead.formName || '-'}</span>
                  </div>
                  {selectedLead.formId && selectedLead.formId !== '-' && (
                    <div className="flex justify-between items-center text-[#5a6a82]">
                      <span>Form ID:</span>
                      <span className="font-mono text-[#0f1d33]">{selectedLead.formId}</span>
                    </div>
                  )}
                  {selectedLead.message && (
                    <div className="pt-1.5 border-t border-[#f1f4f8]">
                      <span className="text-[#8a99ad] block mb-0.5">Initial Message:</span>
                      <p className="text-[#0f1d33] font-medium">{selectedLead.message}</p>
                    </div>
                  )}
                </div>

                {selectedLead.lead_activities?.length > 0 ? (
                  selectedLead.lead_activities.map((activity: any, idx: number) => {
                    const type = activity.activity_type.toLowerCase();
                    const time = new Date(activity.created_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
                    
                    if (type.includes('incoming whatsapp')) {
                      const msg = extractIncomingMessage(activity.details);
                      const media = extractMediaInfo(activity.details);
                      return (
                        <div key={idx} className="flex flex-col items-end self-end max-w-[85%] mt-1">
                          <div className="bg-[#e8f5e9] text-[#0f1d33] rounded-2xl rounded-tr-xs p-3 shadow-xs border border-green-200">
                            {media && (
                              <div className="mb-2 p-2 bg-white rounded-lg border border-green-200 flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-green-700 capitalize">{media.type} Attached</span>
                              </div>
                            )}
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg}</p>
                            <span className="text-[9px] text-green-800/70 block text-right mt-1 font-medium">{time}</span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={idx} className="flex flex-col items-start self-start max-w-[85%] mt-1">
                        <div className="bg-white text-[#0f1d33] rounded-2xl rounded-tl-xs p-3 shadow-xs border border-[#e8ecf2]">
                          <span className="text-[10px] font-bold text-[#1e3a5f] block mb-0.5 uppercase tracking-wider">{activity.activity_type}</span>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{activity.details || activity.description || 'Action recorded'}</p>
                          <span className="text-[9px] text-[#8a99ad] block text-left mt-1 font-medium">{time}</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-[#8a99ad] text-xs">
                    No further chat interactions recorded for this lead.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
