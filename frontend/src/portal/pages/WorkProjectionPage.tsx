/**
 * R.G INFRA CRM — Work Projection Page (Listing)
 * Shows all clients with their construction progress summary.
 * Elderly-friendly: large text, clean cards, minimal clutter.
 */

import { HardHat, Search, ChevronRight, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type WorkProjectionClient } from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, Input, PortalCard, Select, inr } from '../ui'

export function WorkProjectionPage() {
  const navigate = useNavigate()
  const toast = usePortalToast()
  const [clients, setClients] = useState<WorkProjectionClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const load = async () => {
    try {
      setLoading(true)
      const data = await api.getWorkProjectionClients()
      setClients(data)
    } catch (e) {
      toast.push({ tone: 'error', title: 'Failed to load work projections' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.unique_client_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.flat_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.apartment_name?.toLowerCase().includes(search.toLowerCase())

    const pct = Number(c.completed_percentage || 0)
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'not_started' && pct === 0) ||
      (statusFilter === 'in_progress' && pct > 0 && pct < 100) ||
      (statusFilter === 'completed' && pct >= 100)

    return matchSearch && matchStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
          <HardHat className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Work Projection</h1>
          <p className="text-sm text-slate-500">Track construction progress for all clients</p>
        </div>
      </div>

      {/* Search & Filters */}
      <PortalCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, flat or property..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4"
            />
          </div>
          <Select
            label=""
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Progress Status"
            options={[
              { value: 'not_started', label: 'Not Started (0%)' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed (100%)' },
            ]}
          />
        </div>
      </PortalCard>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">Total Clients</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-900">{clients.length}</div>
        </PortalCard>
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">In Progress</div>
          <div className="mt-1 text-3xl font-extrabold text-orange-600">
            {clients.filter((c) => Number(c.completed_percentage || 0) > 0 && Number(c.completed_percentage || 0) < 100).length}
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">Completed</div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-600">
            {clients.filter((c) => Number(c.completed_percentage || 0) >= 100).length}
          </div>
        </PortalCard>
      </div>

      {/* Client Cards */}
      {filtered.length === 0 ? (
        <EmptyState title="No clients found" sub="Try adjusting your search or filter" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => {
            const pct = Number(client.completed_percentage || 0)
            const totalAmount = Number(client.total_amount || 0)
            const dueGenerated = (totalAmount * pct) / 100

            return (
              <PortalCard
                key={client.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/portal/work-projection/${client.id}`)}
              >
                {/* Client Name & ID */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-extrabold text-slate-900">{client.name}</div>
                    <div className="mt-0.5 text-sm font-medium text-slate-500">
                      {client.unique_client_id} • {client.apartment_name || 'No Property'}
                      {client.flat_number && ` • Flat ${client.flat_number}`}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-orange-500 group-hover:translate-x-1" />
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600">Construction Progress</span>
                    <span className={`text-base font-extrabold ${pct >= 100 ? 'text-emerald-600' : pct > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Amount Info */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Property Value</div>
                    <div className="text-base font-bold text-slate-800">{inr(totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Due Generated</div>
                    <div className="text-base font-bold text-orange-700">{inr(dueGenerated)}</div>
                  </div>
                </div>

                {/* Last Updated */}
                {client.last_updated && (
                  <div className="mt-3 text-xs text-slate-400">
                    Last updated: {new Date(client.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </PortalCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
