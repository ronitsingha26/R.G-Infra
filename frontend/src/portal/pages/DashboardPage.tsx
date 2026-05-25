/**
 * RG INFRA — Premium Analytics Dashboard
 * Chart.js powered — Collection trends, Apartment sales, Due vs Paid, Stage progress
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  AlertTriangle, BriefcaseBusiness, Building2, CreditCard,
  HardHat, IndianRupee, TrendingUp, Users, Filter,
} from 'lucide-react'
import { usePortalStore } from '../store'
import { EmptyState, inr, PortalCard } from '../ui'
import {
  api, type ApartmentSalesItem, type CollectionTrendItem,
  type DueListItem, type StageProgressItem, type Apartment,
} from '../api'
import { SendDueReminderButton } from './CommunicationActions'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

// Chart.js global defaults for premium look
ChartJS.defaults.font.family = "'Inter', 'system-ui', sans-serif"
ChartJS.defaults.color = '#64748b'

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, Icon, iconBg, iconColor, trend }: {
  title: string; value: string; sub: string; Icon: typeof HardHat;
  iconBg: string; iconColor: string; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <PortalCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
          <div className={`mt-1.5 text-xs font-semibold ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-500'
          }`}>
            {trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{sub}
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </PortalCard>
  )
}

export function DashboardPage() {
  const store = usePortalStore()
  const navigate = useNavigate()

  // Analytics state
  const [collectionTrend, setCollectionTrend] = useState<CollectionTrendItem[]>([])
  const [apartmentSales, setApartmentSales] = useState<ApartmentSalesItem[]>([])
  const [stageProgress, setStageProgress] = useState<StageProgressItem[]>([])
  const [dueList, setDueList] = useState<DueListItem[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [filterApartment, setFilterApartment] = useState<number | undefined>()

  useEffect(() => {
    (async () => {
      try {
        const [trend, sales, stages, dues, apts] = await Promise.all([
          api.getCollectionTrend(),
          api.getApartmentSales(),
          api.getStageProgress(),
          api.getDueList(),
          api.getApartments(),
        ])
        setCollectionTrend(trend)
        setApartmentSales(sales)
        setStageProgress(stages)
        setDueList(dues)
        setApartments(apts)
      } catch {
        /* silent */
      }
    })()
  }, [store.stats])

  // Reload due list on filter change
  useEffect(() => {
    api.getDueList(filterApartment).then(setDueList).catch(() => {})
  }, [filterApartment])

  if (store.loading) {
    return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
  }

  const s = store.stats
  if (!s) return <EmptyState title="No data available" />

  // ─── Chart Data ──────────────────────────────────────────────────────────

  // 1. Payment Collection Trend (Line)
  const trendData = {
    labels: collectionTrend.map(t => t.label),
    datasets: [{
      label: 'Collection (₹)',
      data: collectionTrend.map(t => Number(t.total_collected)),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.08)',
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#f97316',
      pointBorderWidth: 2,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.4,
    }],
  }

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) => `₹${(ctx.parsed.y / 100000).toFixed(2)}L`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          callback: (v: number | string) => `₹${(Number(v) / 100000).toFixed(0)}L`,
          font: { size: 11 },
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  }

  // 2. Apartment Sales (Bar)
  const salesColors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308']
  const apartmentData = {
    labels: apartmentSales.map(a => a.apartment_name || 'Unknown'),
    datasets: [
      {
        label: 'Collected',
        data: apartmentSales.map(a => Number(a.total_collected)),
        backgroundColor: '#10b981',
        borderRadius: 8,
        barPercentage: 0.6,
      },
      {
        label: 'Pending',
        data: apartmentSales.map(a => Number(a.total_due)),
        backgroundColor: '#ef4444',
        borderRadius: 8,
        barPercentage: 0.6,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12, weight: 'bold' as const } },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ₹${(ctx.parsed.y / 100000).toFixed(2)}L`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          callback: (v: number | string) => `₹${(Number(v) / 100000).toFixed(0)}L`,
          font: { size: 11 },
        },
      },
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  }

  // 3. Due vs Paid Doughnut
  const doughnutData = {
    labels: ['Collected', 'Pending Due'],
    datasets: [{
      data: [s.totalFlatPaid || 0, s.totalFlatDue || 0],
      backgroundColor: ['#10b981', '#ef4444'],
      borderColor: ['#fff', '#fff'],
      borderWidth: 4,
      hoverOffset: 8,
    }],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12, weight: 'bold' as const } },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ₹${(ctx.parsed / 100000).toFixed(2)}L`,
        },
      },
    },
  }

  // 4. Stage Progress (Horizontal Bar)
  const stageData = {
    labels: stageProgress.map(sp => sp.stage_name),
    datasets: [
      {
        label: 'Paid',
        data: stageProgress.map(sp => Number(sp.paid_count)),
        backgroundColor: '#10b981',
        borderRadius: 6,
        barPercentage: 0.7,
      },
      {
        label: 'Partial',
        data: stageProgress.map(sp => Number(sp.partial_count)),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        barPercentage: 0.7,
      },
      {
        label: 'Pending',
        data: stageProgress.map(sp => Number(sp.pending_count)),
        backgroundColor: '#ef4444',
        borderRadius: 6,
        barPercentage: 0.7,
      },
    ],
  }

  const stageBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: 'bold' as const } },
      },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 10 },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { stepSize: 1, font: { size: 11 } },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 12, weight: 'bold' as const } },
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <PortalCard className="!bg-gradient-to-r !from-slate-900 !to-slate-800 !border-slate-700">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}
            </div>
            <div className="mt-1 text-2xl font-extrabold text-white">
              {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'} 👋
            </div>
            <div className="mt-1 text-sm text-slate-400">RG INFRA — Business Intelligence Dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-bold text-emerald-400">Live</span>
            </div>
          </div>
        </div>
      </PortalCard>

      {/* ─── KPI Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sales" value={inr(s.totalFlatSales)} sub={`${s.totalClients} clients`} Icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-500" trend="up" />
        <StatCard title="Collected" value={inr(s.totalFlatPaid)} sub={`${s.totalFlatSales > 0 ? Math.round((s.totalFlatPaid / s.totalFlatSales) * 100) : 0}% of total`} Icon={IndianRupee} iconBg="bg-emerald-50" iconColor="text-emerald-500" trend="up" />
        <StatCard title="Due Amount" value={inr(s.totalFlatDue)} sub={`${dueList.length} clients pending`} Icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" trend={s.totalFlatDue > 0 ? 'down' : 'neutral'} />
        <StatCard title="Properties" value={`${s.totalApartments || s.totalProjects || 0} Apts`} sub={`${s.bookedFlats || s.activeProjects || 0} flats booked`} Icon={Building2} iconBg="bg-blue-50" iconColor="text-blue-500" trend="neutral" />
      </div>

      {/* ─── Row 1: Collection Trend + Due vs Paid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <PortalCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Payment Collection Trend</div>
              <div className="text-xs font-semibold text-slate-400">Last 12 months</div>
            </div>
            <div className="text-sm font-bold text-orange-500">
              {collectionTrend.length > 0 && `${collectionTrend.length} months`}
            </div>
          </div>
          <div className="h-[280px]">
            {collectionTrend.length > 0 ? (
              <Line data={trendData} options={trendOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No collection data yet</div>
            )}
          </div>
        </PortalCard>

        <PortalCard>
          <div className="mb-4">
            <div className="text-lg font-extrabold text-slate-900">Due vs Collected</div>
            <div className="text-xs font-semibold text-slate-400">Overall breakdown</div>
          </div>
          <div className="h-[220px] flex items-center justify-center">
            {(s.totalFlatPaid > 0 || s.totalFlatDue > 0) ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="text-sm text-slate-400">No data</div>
            )}
          </div>
          {/* Center stats */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <div className="text-xs text-slate-400 font-semibold">Collected</div>
              <div className="text-lg font-extrabold text-emerald-600">{inr(s.totalFlatPaid)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 font-semibold">Due</div>
              <div className="text-lg font-extrabold text-red-500">{inr(s.totalFlatDue)}</div>
            </div>
          </div>
        </PortalCard>
      </div>

      {/* ─── Row 2: Apartment Sales + Stage Progress ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PortalCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Apartment-wise Sales</div>
              <div className="text-xs font-semibold text-slate-400">Collected vs Pending per apartment</div>
            </div>
            <Building2 className="h-5 w-5 text-slate-300" />
          </div>
          <div className="h-[280px]">
            {apartmentSales.length > 0 ? (
              <Bar data={apartmentData} options={barOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No apartment data</div>
            )}
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Stage-wise Progress</div>
              <div className="text-xs font-semibold text-slate-400">Client count by payment stage</div>
            </div>
          </div>
          <div className="h-[280px]">
            {stageProgress.length > 0 ? (
              <Bar data={stageData} options={stageBarOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No stage data — define payment stages first</div>
            )}
          </div>
        </PortalCard>
      </div>

      {/* ─── Apartment Sales Cards ─── */}
      {apartmentSales.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apartmentSales.map((apt, i) => (
            <PortalCard key={apt.apartment_id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full`} style={{ backgroundColor: salesColors[i % salesColors.length] }} />
              <div className="pl-3">
                <div className="text-sm font-bold text-slate-900">{apt.apartment_name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{apt.total_clients} clients • {apt.total_flats_sold} flats sold</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Sales</div>
                    <div className="text-sm font-extrabold text-slate-800">{inr(apt.total_sales)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Collected</div>
                    <div className="text-sm font-extrabold text-emerald-600">{inr(apt.total_collected)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Due</div>
                    <div className="text-sm font-extrabold text-red-500">{inr(apt.total_due)}</div>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${apt.total_sales > 0 ? (Number(apt.total_collected) / Number(apt.total_sales)) * 100 : 0}%`,
                    backgroundColor: salesColors[i % salesColors.length],
                  }} />
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      )}

      {/* ─── Due Alerts + Recent Payments ─── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <PortalCard className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">⚠️ Due Payment Alerts</div>
              <div className="text-xs font-semibold text-slate-400">Clients with outstanding payments</div>
            </div>
            {/* Apartment Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterApartment || ''}
                onChange={(e) => setFilterApartment(e.target.value ? Number(e.target.value) : undefined)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-orange-400"
              >
                <option value="">All Apartments</option>
                {apartments.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          {dueList.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No pending dues — all clear! 🎉</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {dueList.map((d) => (
                <div key={d.client_id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-orange-50/30 transition">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{d.client_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {d.apartment_name && `${d.apartment_name} • `}Flat {d.flat_number || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-red-600">{inr(d.due_amount)}</div>
                      <div className="text-[10px] text-slate-400">of {inr(d.total_amount)}</div>
                    </div>
                    {d.email && (
                      <SendDueReminderButton 
                        clientId={d.client_id} 
                        clientEmail={d.email} 
                        totalAmount={d.total_amount || 0} 
                        totalPaid={d.paid_amount || 0}
                        className="!py-1 !px-2.5 !text-[11px]" 
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        <PortalCard className="lg:col-span-2">
          <div className="mb-4">
            <div className="text-lg font-extrabold text-slate-900">Recent Payments</div>
            <div className="text-xs font-semibold text-slate-400">Last 10 payments received</div>
          </div>
          {store.recentPayments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No payments yet</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {store.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
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

      {/* ─── Quick Links ─── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalCard className="cursor-pointer hover:border-orange-300 hover:shadow-md transition group" onClick={() => navigate('/portal/clients')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">View All Clients</div>
              <div className="text-xs text-slate-400">{s.totalClients} total</div>
            </div>
          </div>
        </PortalCard>
        <PortalCard className="cursor-pointer hover:border-orange-300 hover:shadow-md transition group" onClick={() => navigate('/portal/payments')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition">
              <CreditCard className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">View All Payments</div>
              <div className="text-xs text-slate-400">{inr(s.totalPaid)} collected</div>
            </div>
          </div>
        </PortalCard>
        <PortalCard className="cursor-pointer hover:border-orange-300 hover:shadow-md transition group" onClick={() => navigate('/portal/payment-schedule')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
              <BriefcaseBusiness className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Payment Schedule</div>
              <div className="text-xs text-slate-400">Manage installments</div>
            </div>
          </div>
        </PortalCard>
      </div>
    </div>
  )
}
