'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { Users, UserCheck, TrendingUp, PhoneCall, CheckCircle } from 'lucide-react'

type Lead = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  source_page?: string | null
  project?: string | null
  property_interest?: string | null
  downloaded_item?: string | null
  created_at: string
}

interface ReportsClientProps {
  initialLeads: Lead[]
}

const COLORS = ['#1e3a5f', '#c4a55a', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']

export default function ReportsClient({ initialLeads }: ReportsClientProps) {
  
  // Aggregate data
  const metrics = useMemo(() => {
    const total = initialLeads.length
    const newLeads = initialLeads.filter(l => l.status === 'new').length
    const contacted = initialLeads.filter(l => l.status === 'contacted').length
    const qualified = initialLeads.filter(l => l.status === 'qualified').length
    const closed = initialLeads.filter(l => l.status === 'closed').length

    return { total, newLeads, contacted, qualified, closed }
  }, [initialLeads])

  const statusData = useMemo(() => {
    return [
      { name: 'New', value: metrics.newLeads },
      { name: 'Contacted', value: metrics.contacted },
      { name: 'Qualified', value: metrics.qualified },
      { name: 'Closed', value: metrics.closed },
    ].filter(item => item.value > 0)
  }, [metrics])

  const projectData = useMemo(() => {
    const projects = initialLeads.reduce((acc, lead) => {
      const project = lead.project || lead.property_interest || 'Unspecified'
      acc[project] = (acc[project] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(projects).map(key => ({
      name: key,
      value: projects[key]
    })).sort((a, b) => b.value - a.value)
  }, [initialLeads])

  const recentLeadsData = useMemo(() => {
    // Group by month
    const months = initialLeads.reduce((acc, lead) => {
      const date = new Date(lead.created_at)
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      acc[monthYear] = (acc[monthYear] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(months).map(key => ({
      name: key,
      Leads: months[key]
    })).reverse() // Show chronological if initially sorted descending
  }, [initialLeads])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Reports & Analytics</h1>
        <p className="mt-2 text-sm text-[#5a6a82]">
          Track your lead acquisition and performance metrics.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Total Leads"
          value={metrics.total}
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <MetricCard
          title="New Leads"
          value={metrics.newLeads}
          icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#c4a55a]" />}
          bg="bg-[#c4a55a]/10"
        />
        <MetricCard
          title="Contacted"
          value={metrics.contacted}
          icon={<PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
          bg="bg-indigo-50"
        />
        <MetricCard
          title="Qualified"
          value={metrics.qualified}
          icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
          bg="bg-emerald-50"
        />
        <MetricCard
          title="Closed Deals"
          value={metrics.closed}
          icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
          bg="bg-purple-50"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Charts Grid: Leads by Project, Leads by Status, Leads Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Leads by Project (Bar) */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-[#0f1d33] mb-4 sm:mb-6">Leads by Project</h3>
          {projectData.length > 0 ? (
            <div 
              className="overflow-x-auto pb-2" 
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
            >
              <div className="min-w-[560px] sm:min-w-full h-84">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectData} margin={{ top: 10, right: 30, left: 10, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf2" />
                    <XAxis 
                      dataKey="name" 
                      tickFormatter={(val) => val.length > 18 ? val.substring(0, 16) + '...' : val}
                      tick={{ fill: '#5a6a82', fontSize: 11 }} 
                      angle={-45}
                      textAnchor="end"
                      height={65}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      cursor={{ fill: '#f3f5f8' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-84 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

        {/* Leads by Status (Pie) */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-[#0f1d33] mb-4 sm:mb-6">Leads by Status</h3>
          {statusData.length > 0 ? (
            <div className="h-84">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-84 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

        {/* Leads Over Time (Bar) */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#e8ecf2] shadow-sm lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold text-[#0f1d33] mb-4 sm:mb-6">Leads Over Time</h3>
          {recentLeadsData.length > 0 ? (
            <div 
              className="overflow-x-auto pb-2" 
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
            >
              <div className="min-w-[500px] sm:min-w-full h-84">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentLeadsData} margin={{ top: 10, right: 30, left: 10, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf2" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#5a6a82', fontSize: 11 }} 
                      angle={-45}
                      textAnchor="end"
                      height={65}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      cursor={{ fill: '#f3f5f8' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="Leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-84 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, bg, className }: { title: string, value: number, icon: React.ReactNode, bg: string, className?: string }) {
  return (
    <div className={`bg-white p-4 sm:p-5 rounded-xl border border-[#e8ecf2] shadow-sm flex flex-col justify-between ${className || ''}`}>
      <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
        <h3 className="text-[#5a6a82] text-xs sm:text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${bg} shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-[#0f1d33]">
        {value}
      </div>
    </div>
  )
}
