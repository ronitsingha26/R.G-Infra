import { Mail, Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, PortalButton, PortalCard } from '../ui'

export function PaymentsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const [search, setSearch] = useState('')

  const filtered = store.payments.filter(p => {
    const q = search.toLowerCase()
    return !q || p.client_name?.toLowerCase().includes(q) || p.project_name?.toLowerCase().includes(q) || p.reference_no?.toLowerCase().includes(q)
  })

  const total = filtered.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Payments</div>
            <div className="text-sm text-slate-500">{store.payments.length} total payments • Total: {inr(total)}</div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:ring-2 w-56" />
          </div>
        </div>
      </PortalCard>

      {filtered.length === 0 ? <EmptyState title="No payments found" sub="Payments will appear here when added from projects" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Project</th><th className="px-5 py-3">Mode</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-center">Email</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{filtered.map(p => (
              <tr key={p.id} className="text-slate-700">
                <td className="px-5 py-4">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-5 py-4 font-semibold">{p.client_name || '—'}</td>
                <td className="px-5 py-4">{p.project_name || '—'}</td>
                <td className="px-5 py-4">{p.payment_mode || '—'}</td>
                <td className="px-5 py-4 text-xs">{p.reference_no || '—'}</td>
                <td className="px-5 py-4 text-right font-bold text-emerald-600">{inr(p.amount)}</td>
                <td className="px-5 py-4 text-center">{p.email_sent ? <span className="text-emerald-500 text-xs font-bold">Sent ✓</span> : <span className="text-slate-300">—</span>}</td>
                <td className="px-5 py-4">{!p.email_sent && p.client_email && (
                  <PortalButton variant="outline" className="!py-1 !px-2 !text-xs" onClick={async () => {
                    try { await api.sendReceipt(p.id); toast.push({ tone:'success', title:'Receipt sent' }); store.refreshPayments() } catch { toast.push({ tone:'error', title:'Failed' }) }
                  }}><Mail className="h-3 w-3" /> Send</PortalButton>
                )}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
