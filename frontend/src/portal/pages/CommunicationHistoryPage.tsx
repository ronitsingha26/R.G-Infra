/**
 * RG INFRA — Communication History Page
 * Shows all sent emails, demand letters, whatsapp messages with filters
 */

import { useEffect, useState } from 'react'
import { Mail, MessageCircle, FileText, Receipt, Search, Download } from 'lucide-react'
import { api, type CommunicationLog, type CommunicationStats } from '../api'
import { usePortalToast } from '../toast'
import { PortalCard, EmptyState } from '../ui'

export function CommunicationHistoryPage() {
  const toast = usePortalToast()
  const [logs, setLogs] = useState<CommunicationLog[]>([])
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'email' | 'whatsapp'>('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const [logsData, statsData] = await Promise.all([
        api.getCommunications(),
        api.getCommunicationStats(),
      ])
      setLogs(logsData)
      setStats(statsData)
    } catch (e) {
      toast.push({ tone: 'error', title: 'Failed to load communication history' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredLogs = logs
    .filter((l) => filter === 'all' || l.channel === filter)
    .filter((l) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        l.client_name?.toLowerCase().includes(q) ||
        l.subject?.toLowerCase().includes(q) ||
        l.recipient_email?.toLowerCase().includes(q) ||
        l.recipient_phone?.includes(q) ||
        l.flat_number?.toLowerCase().includes(q)
      )
    })

  const statusColor = (s: string) => {
    if (s === 'sent') return 'bg-emerald-100 text-emerald-700'
    if (s === 'failed') return 'bg-red-100 text-red-700'
    if (s === 'initiated') return 'bg-blue-100 text-blue-700'
    return 'bg-slate-100 text-slate-600'
  }

  const typeIcon = (type: string, channel: string) => {
    if (type === 'demand_letter') return <FileText className="h-4 w-4 text-orange-500" />
    if (type === 'invoice') return <Receipt className="h-4 w-4 text-indigo-500" />
    if (channel === 'whatsapp') return <MessageCircle className="h-4 w-4 text-green-600" />
    if (type === 'payment_receipt') return <Receipt className="h-4 w-4 text-emerald-500" />
    return <Mail className="h-4 w-4 text-blue-500" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Communication History</h1>
        <p className="text-sm text-slate-500 mt-1">Track all emails, demand letters, and WhatsApp messages sent to clients</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Total</div>
                <div className="text-xl font-extrabold text-slate-900">{stats.total_communications || 0}</div>
              </div>
            </div>
          </PortalCard>
          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Emails</div>
                <div className="text-xl font-extrabold text-blue-600">{stats.total_emails || 0}</div>
              </div>
            </div>
          </PortalCard>
          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">WhatsApp</div>
                <div className="text-xl font-extrabold text-green-600">{stats.total_whatsapp || 0}</div>
              </div>
            </div>
          </PortalCard>
          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Failed</div>
                <div className="text-xl font-extrabold text-red-600">{stats.total_failed || 0}</div>
              </div>
            </div>
          </PortalCard>
        </div>
      )}

      {/* Filters & Search */}
      <PortalCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client, subject, email, phone..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 ring-orange-400/40"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'email', 'whatsapp'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  filter === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f === 'email' ? '📧 Email' : '💬 WhatsApp'}
              </button>
            ))}
          </div>
        </div>
      </PortalCard>

      {/* Logs List */}
      {!filteredLogs.length ? (
        <EmptyState title="No communications found" sub="Adjust your filters or generate a demand letter" />
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <PortalCard key={log.id} className="!p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="mt-1 h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  {typeIcon(log.type, log.channel)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 truncate">{log.subject || log.type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(log.status)}`}>
                      {log.status}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      log.channel === 'whatsapp' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {log.channel}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                    {log.client_name && <span>👤 {log.client_name}</span>}
                    {log.apartment_name && <span>🏠 {log.apartment_name}</span>}
                    {log.flat_number && <span>🚪 Flat {log.flat_number}</span>}
                    {log.recipient_email && <span>📧 {log.recipient_email}</span>}
                    {log.recipient_phone && <span>📱 {log.recipient_phone}</span>}
                  </div>

                  {log.error_message && (
                    <div className="mt-1.5 text-xs text-red-500 font-medium">❌ {log.error_message}</div>
                  )}

                  {(log.demand_letter_file || log.invoice_file) && (
                    <a
                      href={log.demand_letter_url || log.invoice_url || log.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      <Download className="h-3.5 w-3.5" /> {log.demand_letter_file || log.invoice_file}
                    </a>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {log.sent_on ? new Date(log.sent_on).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      )}
    </div>
  )
}
