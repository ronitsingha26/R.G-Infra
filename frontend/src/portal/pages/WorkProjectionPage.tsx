/**
 * R.G INFRA CRM — Work Projection Page (Apartment-Grouped View)
 *
 * Layout:
 *  - Apartments listed as expandable cards (Block A, Block B...)
 *  - Each apartment shows all clients inside it with progress
 *  - "Update All" button to bulk-update progress for entire apartment
 *  - Click individual client → go to client work projection detail page
 */

import {
  HardHat, ChevronRight, ChevronDown, Search, RefreshCw,
  Building2, Users, TrendingUp, Zap, Save, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type WorkProjectionClient } from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Modal, PortalButton, PortalCard, Select } from '../ui'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApartmentGroup = {
  apartment_name: string
  clients: WorkProjectionClient[]
  avgProgress: number
  totalValue: number
}

// ─── Milestone definitions (same as WorkProjectionClientPage) ─────────────────
const DEFAULT_MILESTONES = [
  { name: 'Booking', pct: 10 },
  { name: 'Foundation', pct: 10 },
  { name: 'Plinth', pct: 5 },
  { name: 'Ground Floor Slab', pct: 5 },
  { name: '1st Floor Slab', pct: 5 },
  { name: '2nd Floor Slab', pct: 5 },
  { name: '3rd Floor Slab', pct: 5 },
  { name: '4th Floor Slab', pct: 5 },
  { name: '5th Floor Slab', pct: 5 },
  { name: 'Roof Slab', pct: 5 },
  { name: 'Brick Work', pct: 5 },
  { name: 'Plaster', pct: 5 },
  { name: 'Flooring', pct: 5 },
  { name: 'Doors & Windows', pct: 5 },
  { name: 'Electrical & Plumbing', pct: 5 },
  { name: 'Handover', pct: 5 },
]

// ─── Bulk Update Modal ────────────────────────────────────────────────────────

type BulkUpdateModalProps = {
  open: boolean
  onClose: () => void
  apartmentName: string
  clients: WorkProjectionClient[]
  onSuccess: () => void
}

function BulkUpdateModal({ open, onClose, apartmentName, clients, onSuccess }: BulkUpdateModalProps) {
  const toast = usePortalToast()
  const [selectedMilestone, setSelectedMilestone] = useState('')
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<{ name: string; status: 'ok' | 'skip' | 'error'; msg?: string }[]>([])
  const [done, setDone] = useState(false)

  const eligibleClients = clients.filter(c => {
    const pct = Number(c.completed_percentage || 0)
    return pct < 100
  })

  const handleBulkSave = async () => {
    if (!selectedMilestone) return
    setSaving(true)
    setResults([])

    const res: typeof results = []
    for (const client of eligibleClients) {
      try {
        await api.createWorkProjection({
          client_id: client.id,
          milestone_name: selectedMilestone,
          completion_date: completionDate,
          due_date: dueDate,
          notes: notes || undefined,
        })
        // Auto-generate demand letter
        try {
          await api.generateDemandLetter({
            client_id: client.id, paid_amount: 0,
            send_email: false, send_whatsapp: false,
          })
        } catch { /* demand letter optional */ }
        res.push({ name: client.name, status: 'ok' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        // If "already recorded" — skip
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
          res.push({ name: client.name, status: 'skip', msg: 'Already recorded' })
        } else {
          res.push({ name: client.name, status: 'error', msg })
        }
      }
    }

    setResults(res)
    setSaving(false)
    setDone(true)
    const ok = res.filter(r => r.status === 'ok').length
    toast.push({ tone: ok > 0 ? 'success' : 'error', title: `${ok} of ${eligibleClients.length} clients updated` })
    if (ok > 0) onSuccess()
  }

  const handleClose = () => {
    setSelectedMilestone(''); setNotes(''); setResults([]); setDone(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`🏗️ Bulk Update — ${apartmentName}`} wide>
      {!done ? (
        <div className="space-y-5">
          {/* Info Banner */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-1">
              <Zap className="h-4 w-4 text-blue-600" />
              Update progress for all {eligibleClients.length} clients in {apartmentName} at once
            </div>
            <div className="text-xs text-blue-600">
              Only clients below 100% progress will be updated. Already-completed milestones will be skipped.
            </div>
          </div>

          {/* Eligible client list */}
          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            {eligibleClients.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{c.name}</span>
                <span className="text-slate-400">
                  Flat {c.flat_number} • {Number(c.completed_percentage || 0)}%
                </span>
              </div>
            ))}
            {eligibleClients.length === 0 && (
              <div className="text-sm text-slate-400 text-center py-2">All clients completed 100%</div>
            )}
          </div>

          {/* Milestone Selector */}
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Select Milestone <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMilestone}
              onChange={e => setSelectedMilestone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
            >
              <option value="">Choose milestone...</option>
              {DEFAULT_MILESTONES.map(m => (
                <option key={m.name} value={m.name}>{m.name} ({m.pct}%)</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Completion Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4" />
            </div>
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Payment Due Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any remarks..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4 resize-none" />
          </div>

          <div className="flex justify-end gap-3">
            <PortalButton variant="outline" onClick={handleClose}>Cancel</PortalButton>
            <PortalButton
              onClick={handleBulkSave}
              disabled={saving || !selectedMilestone || eligibleClients.length === 0}
            >
              <Save className="h-4 w-4" />
              {saving ? `Updating ${eligibleClients.length} clients...` : `Update All ${eligibleClients.length} Clients`}
            </PortalButton>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-4">
          <div className="text-sm font-bold text-slate-700 mb-2">Update Results:</div>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl p-3 text-sm border ${
                r.status === 'ok' ? 'border-emerald-100 bg-emerald-50' :
                r.status === 'skip' ? 'border-slate-100 bg-slate-50' :
                'border-red-100 bg-red-50'
              }`}>
                <span className="font-semibold text-slate-700">{r.name}</span>
                <span className={`font-bold ${
                  r.status === 'ok' ? 'text-emerald-600' :
                  r.status === 'skip' ? 'text-slate-400' : 'text-red-600'
                }`}>
                  {r.status === 'ok' ? '✅ Updated' : r.status === 'skip' ? '⏭ Skipped' : `❌ ${r.msg}`}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <PortalButton onClick={handleClose}>Close</PortalButton>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, size = 'md' }: { pct: number; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-2' : 'h-3'
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-slate-100`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

// ─── Client Row ───────────────────────────────────────────────────────────────

function ClientRow({ client, onClick }: { client: WorkProjectionClient; onClick: () => void }) {
  const pct = Number(client.completed_percentage || 0)
  const totalAmount = Number(client.total_amount || 0)
  const dueGenerated = (totalAmount * pct) / 100

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 cursor-pointer rounded-xl border border-slate-100 bg-white px-5 py-4 transition hover:border-orange-200 hover:bg-orange-50/30 hover:shadow-sm"
    >
      {/* Client info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-extrabold text-slate-900">{client.name}</span>
          <span className="text-xs text-slate-400 font-medium">{client.unique_client_id}</span>
          {client.flat_number && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              Flat {client.flat_number}
            </span>
          )}
        </div>
        {/* Progress bar + % */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar pct={pct} size="sm" />
          </div>
          <span className={`text-sm font-extrabold w-12 text-right shrink-0 ${pct >= 100 ? 'text-emerald-600' : pct > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Amounts — hidden on mobile */}
      <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[110px]">
        <div className="text-xs text-slate-400 font-semibold">Flat Value</div>
        <div className="text-sm font-bold text-slate-800">{totalAmount > 0 ? inr(totalAmount) : '—'}</div>
        <div className="text-xs text-orange-600 font-semibold mt-0.5">{dueGenerated > 0 ? `Due: ${inr(dueGenerated)}` : ''}</div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 transition group-hover:text-orange-500 group-hover:translate-x-1" />
    </div>
  )
}

// ─── Apartment Card ───────────────────────────────────────────────────────────

function ApartmentCard({
  group, expanded, onToggle, onBulkUpdate,
}: {
  group: ApartmentGroup
  expanded: boolean
  onToggle: () => void
  onBulkUpdate: () => void
}) {
  const navigate = useNavigate()
  const inProgress = group.clients.filter(c => {
    const p = Number(c.completed_percentage || 0)
    return p > 0 && p < 100
  }).length
  const completed = group.clients.filter(c => Number(c.completed_percentage || 0) >= 100).length
  const notStarted = group.clients.filter(c => Number(c.completed_percentage || 0) === 0).length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md">
      {/* Apartment Header */}
      <div
        className="flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-slate-50/80 transition"
        onClick={onToggle}
      >
        {/* Icon + Name */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md">
          <Building2 className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-extrabold text-slate-900">{group.apartment_name}</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                <Users className="inline h-3 w-3 mr-1" />{group.clients.length} Clients
              </span>
              {inProgress > 0 && (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 font-bold text-orange-700">
                  {inProgress} In Progress
                </span>
              )}
              {completed > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700">
                  {completed} Completed
                </span>
              )}
              {notStarted > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-500">
                  {notStarted} Not Started
                </span>
              )}
            </div>
          </div>

          {/* Apartment-wide progress bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar pct={group.avgProgress} />
            </div>
            <span className={`text-sm font-extrabold shrink-0 ${group.avgProgress >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {group.avgProgress}% avg
            </span>
          </div>
        </div>

        {/* Bulk Update Button + Expand */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onBulkUpdate() }}
            className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-100 hover:border-orange-300"
            title={`Update all clients in ${group.apartment_name}`}
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Update All</span>
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400">
            {expanded ? <ChevronDown className="h-5 w-5 text-orange-500" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Expanded: Client List */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2 bg-slate-50/40">
          {group.clients.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">No clients in this apartment</div>
          ) : (
            group.clients.map(client => (
              <ClientRow
                key={client.id}
                client={client}
                onClick={() => navigate(`/portal/work-projection/${client.id}`)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WorkProjectionPage() {
  const toast = usePortalToast()
  const [clients, setClients] = useState<WorkProjectionClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedApts, setExpandedApts] = useState<Set<string>>(new Set())
  const [bulkModal, setBulkModal] = useState<{ open: boolean; group: ApartmentGroup | null }>({ open: false, group: null })

  const load = async () => {
    try {
      setLoading(true)
      const data = await api.getWorkProjectionClients()
      setClients(data)
      // Auto-expand if only 1 apartment
      const names = [...new Set(data.map(c => c.apartment_name || 'No Apartment'))]
      if (names.length === 1) setExpandedApts(new Set(names))
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load work projections' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Filter clients
  const filtered = clients.filter(c => {
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

  // Group by apartment
  const groups: ApartmentGroup[] = []
  const groupMap = new Map<string, WorkProjectionClient[]>()
  for (const c of filtered) {
    const key = c.apartment_name || 'No Apartment'
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(c)
  }
  for (const [name, cls] of groupMap.entries()) {
    const avgProgress = cls.length > 0
      ? Math.round(cls.reduce((s, c) => s + Number(c.completed_percentage || 0), 0) / cls.length)
      : 0
    const totalValue = cls.reduce((s, c) => s + Number(c.total_amount || 0), 0)
    groups.push({ apartment_name: name, clients: cls, avgProgress, totalValue })
  }
  groups.sort((a, b) => a.apartment_name.localeCompare(b.apartment_name))

  const toggleApt = (name: string) => {
    setExpandedApts(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Stats
  const totalClients = clients.length
  const inProgress = clients.filter(c => { const p = Number(c.completed_percentage || 0); return p > 0 && p < 100 }).length
  const completed = clients.filter(c => Number(c.completed_percentage || 0) >= 100).length
  const totalApts = [...new Set(clients.map(c => c.apartment_name || 'No Apartment'))].length

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
            <HardHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Work Projection</h1>
            <p className="text-sm text-slate-500">Track construction progress by apartment</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Search & Filters */}
      <PortalCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, flat or apartment..."
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
      <div className="grid gap-4 sm:grid-cols-4">
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">Apartments</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-900">{totalApts}</div>
        </PortalCard>
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">Total Clients</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-900">{totalClients}</div>
        </PortalCard>
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">In Progress</div>
          <div className="mt-1 text-3xl font-extrabold text-orange-600">{inProgress}</div>
        </PortalCard>
        <PortalCard>
          <div className="text-sm font-semibold text-slate-400">Completed</div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-600">{completed}</div>
        </PortalCard>
      </div>

      {/* Apartment Groups */}
      {groups.length === 0 ? (
        <EmptyState title="No clients found" sub="Try adjusting your search or filter" />
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <ApartmentCard
              key={group.apartment_name}
              group={group}
              expanded={expandedApts.has(group.apartment_name)}
              onToggle={() => toggleApt(group.apartment_name)}
              onBulkUpdate={() => setBulkModal({ open: true, group })}
            />
          ))}
        </div>
      )}

      {/* Bulk Update Modal */}
      {bulkModal.group && (
        <BulkUpdateModal
          open={bulkModal.open}
          onClose={() => setBulkModal({ open: false, group: null })}
          apartmentName={bulkModal.group.apartment_name}
          clients={bulkModal.group.clients}
          onSuccess={load}
        />
      )}
    </div>
  )
}
