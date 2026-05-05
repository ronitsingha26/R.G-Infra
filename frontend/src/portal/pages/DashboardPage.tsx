import { AlertTriangle, BriefcaseBusiness, CreditCard, HardHat, IndianRupee, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, PortalButton, PortalCard } from '../ui'
import { api } from '../api'

function StatCard({ title, value, sub, Icon, tone }: { title: string; value: string; sub: string; Icon: typeof HardHat; tone: string }) {
  return (
    <PortalCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
          <div className={`mt-1 text-xs font-semibold ${tone}`}>{sub}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </PortalCard>
  )
}

export function DashboardPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const navigate = useNavigate()

  if (store.loading) {
    return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
  }

  const s = store.stats
  if (!s) return <EmptyState title="No data available" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <PortalCard>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">
              {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'} 👋
            </div>
            <div className="mt-1 text-sm text-slate-500">Here's your business overview for today.</div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-700">Live</span>
          </div>
        </div>
      </PortalCard>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Clients" value={String(s.totalClients)} sub={`${s.totalProjects} projects`} Icon={BriefcaseBusiness} tone="text-slate-500" />
        <StatCard title="Active Projects" value={String(s.activeProjects)} sub={`${s.completedProjects} completed`} Icon={HardHat} tone="text-emerald-600" />
        <StatCard title="Total Received" value={inr(s.totalPaid)} sub={`of ${inr(s.totalProjectAmount)}`} Icon={IndianRupee} tone="text-emerald-600" />
        <StatCard title="Total Due" value={inr(s.totalDue)} sub={`${store.dueAlerts.length} clients`} Icon={AlertTriangle} tone={s.totalDue > 0 ? 'text-red-500' : 'text-emerald-600'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Due Payment Alerts */}
        <PortalCard className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">⚠️ Due Payment Alerts</div>
              <div className="text-xs font-semibold text-slate-400">Clients with outstanding payments</div>
            </div>
          </div>
          {store.dueAlerts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No pending dues — all clear! 🎉</div>
          ) : (
            <div className="space-y-3">
              {store.dueAlerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900">{a.company_name}</div>
                    <div className="text-xs text-slate-500">{a.contact_person} • {a.email || 'No email'}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-red-600">{inr(a.due_amount)}</div>
                      <div className="text-[11px] text-slate-400">due</div>
                    </div>
                    {a.email && (
                      <PortalButton variant="outline" className="!py-1.5 !px-3 !text-xs" onClick={async () => {
                        try { await api.sendDueReminder(a.id); toast.push({ tone: 'success', title: `Due reminder sent to ${a.company_name}` }); } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
                      }}>
                        <Mail className="h-3.5 w-3.5" /> Remind
                      </PortalButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        {/* Recent Payments */}
        <PortalCard className="lg:col-span-2">
          <div className="mb-4">
            <div className="text-lg font-extrabold text-slate-900">Recent Payments</div>
            <div className="text-xs font-semibold text-slate-400">Last 10 payments received</div>
          </div>
          {store.recentPayments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No payments yet</div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-auto">
              {store.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{p.client_name || '—'}</div>
                    <div className="text-xs text-slate-400">{p.project_name} • {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-600 shrink-0">{inr(p.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PortalCard className="cursor-pointer hover:border-orange-300 transition" onClick={() => navigate('/portal/clients')}>
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="h-5 w-5 text-orange-500" />
            <div className="text-sm font-bold text-slate-800">View All Clients →</div>
          </div>
        </PortalCard>
        <PortalCard className="cursor-pointer hover:border-orange-300 transition" onClick={() => navigate('/portal/payments')}>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-orange-500" />
            <div className="text-sm font-bold text-slate-800">View All Payments →</div>
          </div>
        </PortalCard>
      </div>
    </div>
  )
}
