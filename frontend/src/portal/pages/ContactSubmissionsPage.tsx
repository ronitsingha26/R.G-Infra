import { CheckCircle, Mail } from 'lucide-react'
import { api } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, PortalCard } from '../ui'

export function ContactSubmissionsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()

  const unread = store.contactSubmissions.filter(c => !c.is_read).length

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="text-2xl font-extrabold text-slate-900">Contact Enquiries</div>
        <div className="text-sm text-slate-500">{store.contactSubmissions.length} total • {unread} unread</div>
      </PortalCard>

      {store.contactSubmissions.length === 0 ? <EmptyState title="No enquiries yet" sub="Enquiries from the landing page will appear here" /> : (
        <div className="space-y-3">
          {store.contactSubmissions.map(c => (
            <PortalCard key={c.id} className={!c.is_read ? '!border-orange-300 !bg-orange-50/50' : ''}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-slate-900">{c.name}</div>
                    {!c.is_read && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {c.email && <span><Mail className="h-3 w-3 inline mr-1" />{c.email}</span>}
                    {c.phone && <span className="ml-3">📞 {c.phone}</span>}
                    {c.project_type && <span className="ml-3">🏗️ {c.project_type}</span>}
                  </div>
                  {c.message && <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">{c.message}</div>}
                  <div className="mt-2 text-[11px] text-slate-400">{new Date(c.created_at).toLocaleString('en-IN')}</div>
                </div>
                {!c.is_read && (
                  <button onClick={async () => {
                    try { await api.markContactRead(c.id); toast.push({ tone:'success', title:'Marked as read' }); store.refreshContacts(); store.refreshDashboard() }
                    catch { toast.push({ tone:'error', title:'Failed' }) }
                  }} className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition">
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Read
                  </button>
                )}
              </div>
            </PortalCard>
          ))}
        </div>
      )}
    </div>
  )
}
