import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw, Search } from 'lucide-react'
import { api, type ClientHistoryItem } from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, inr, PortalButton, PortalCard } from '../ui'

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ClientHistoryPage() {
  const toast = usePortalToast()
  const [rows, setRows] = useState<ClientHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'due' | 'paid'>('all')

  const load = async () => {
    try {
      setLoading(true)
      setRows(await api.getClientHistory())
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to load client history' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.toLowerCase().trim()
    const matchesSearch = !q || [
      row.name,
      row.unique_client_id,
      row.phone,
      row.email,
      row.apartment_name,
      row.flat_number,
      row.latest_demand_letter_file,
      row.latest_invoice_no,
      row.latest_invoice_file,
    ].some((value) => String(value || '').toLowerCase().includes(q))
    const due = Number(row.total_due || 0)
    const matchesStatus = status === 'all' || (status === 'due' ? due > 0 : due <= 0)
    return matchesSearch && matchesStatus
  }), [rows, search, status])

  const totals = useMemo(() => filtered.reduce((acc, row) => ({
    amount: acc.amount + Number(row.total_amount || 0),
    paid: acc.paid + Number(row.total_paid || 0),
    due: acc.due + Number(row.total_due || 0),
  }), { amount: 0, paid: 0, due: 0 }), [filtered])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Client History</h1>
          <p className="mt-1 text-sm text-slate-500">Client details, demand letters, invoices, paid amount, pending amount, and next due schedule</p>
        </div>
        <PortalButton variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</PortalButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Value</div><div className="mt-1 text-xl font-extrabold text-slate-900">{inr(totals.amount)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Paid</div><div className="mt-1 text-xl font-extrabold text-emerald-600">{inr(totals.paid)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Due</div><div className="mt-1 text-xl font-extrabold text-red-600">{inr(totals.due)}</div></PortalCard>
      </div>

      <PortalCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, flat, phone, email, demand letter, invoice..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:border-orange-400 focus:ring-2"
            />
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {([
              ['all', 'All'],
              ['due', 'Due'],
              ['paid', 'Paid Up'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${status === value ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </PortalCard>

      {!filtered.length ? (
        <EmptyState title="No client history found" sub="Try changing the search or filter" />
      ) : (
        <PortalCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Client</th>
                  <th className="px-4 py-3 text-left font-bold">Property</th>
                  <th className="px-4 py-3 text-right font-bold">Paid</th>
                  <th className="px-4 py-3 text-right font-bold">Due</th>
                  <th className="px-4 py-3 text-left font-bold">Current / Next</th>
                  <th className="px-4 py-3 text-left font-bold">Demand Letter</th>
                  <th className="px-4 py-3 text-left font-bold">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 align-top">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{row.unique_client_id}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.phone || '-'}{row.email ? ` | ${row.email}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-700">{row.apartment_name || '-'}</div>
                      <div className="mt-0.5 text-xs text-slate-500">Flat {row.flat_number || '-'}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{row.property_name || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="font-bold text-emerald-600">{inr(row.total_paid)}</div>
                      <div className="mt-0.5 text-xs text-slate-400">of {inr(row.total_amount)}</div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className={`font-extrabold ${Number(row.total_due || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{inr(row.total_due)}</div>
                      <div className="mt-0.5 text-xs text-slate-400">Due Now {inr(row.combined_due || row.total_due)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-xs font-bold text-amber-700">{row.current_stage_name || 'No active due'} {row.current_stage_due ? `- ${inr(row.current_stage_due)}` : ''}</div>
                      <div className="mt-0.5 text-xs text-slate-500">Due: {formatDate(row.current_due_date)}</div>
                      {row.next_stage_name && (
                        <div className="mt-2 text-xs text-blue-700">
                          Next: <strong>{row.next_stage_name}</strong> - {inr(row.next_stage_amount || 0)} by {formatDate(row.next_due_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.latest_demand_letter_url ? (
                        <a href={row.latest_demand_letter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700">
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><FileText className="h-3.5 w-3.5" /> Not generated</span>
                      )}
                      {row.latest_demand_letter_date && <div className="mt-1 text-xs text-slate-400">{formatDate(row.latest_demand_letter_date)}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.latest_invoice_url ? (
                        <a href={row.latest_invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><FileText className="h-3.5 w-3.5" /> Not generated</span>
                      )}
                      {row.latest_invoice_date && <div className="mt-1 text-xs text-slate-400">{formatDate(row.latest_invoice_date)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PortalCard>
      )}
    </div>
  )
}
