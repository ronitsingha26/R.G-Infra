import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Mail, FileText, Download, Clock, CheckCircle2, RefreshCw, Calendar, Send, Paperclip, Search, MessageCircle, AlertTriangle, CreditCard, CheckSquare, Square } from 'lucide-react'
import { api, type DueReminder, type PendingDue, type ReminderLog, type ReminderStats } from '../api'
import { usePortalToast } from '../toast'
import { PortalCard, PortalButton, Modal, EmptyState, inr, Input } from '../ui'

type Tab = 'upcoming' | 'history'
type DisplayDue = PendingDue & {
  reminder_id: number;
  due_status: 'upcoming' | 'overdue' | 'paid';
  email_status: DueReminder['email_status'];
  reminder_count: number;
  last_sent_at: string | null;
  gst_percent?: number;
  gst_amount?: number;
  total_payable?: number;
}

function mapDueReminder(due: DueReminder): DisplayDue {
  return {
    id: due.id,
    reminder_id: due.id,
    client_id: due.client_id,
    flat_id: due.flat_id || 0,
    total_flat_amount: Number(due.total_amount || 0),
    total_paid: Number(due.total_paid || 0),
    total_due: Number(due.due_amount || 0),
    current_stage_name: due.projection_stage,
    current_stage_due: Number(due.due_amount || 0),
    current_due: Number(due.due_amount || 0),
    next_stage_name: '',
    next_stage_amount: 0,
    combined_due: Number(due.due_amount || 0),
    current_schedule_id: due.schedule_id || undefined,
    current_due_date: due.due_date || undefined,
    current_stage_percentage: Number(due.payment_percentage || 0),
    client_name: due.client_name,
    unique_client_id: '',
    phone: due.phone,
    email: due.email,
    flat_number: due.flat_unit,
    apartment_name: due.apartment_name,
    due_status: due.status,
    email_status: due.email_status,
    reminder_count: Number(due.reminder_count || 0),
    last_sent_at: due.last_sent_at,
    gst_percent: Number(due.gst_percent || 0),
    gst_amount: Number(due.gst_amount || 0),
    total_payable: Number(due.total_payable || due.due_amount || 0),
  }
}

export function ReminderLogsPage() {
  const navigate = useNavigate()
  const toast = usePortalToast()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [pendingDues, setPendingDues] = useState<DisplayDue[]>([])
  const [logs, setLogs] = useState<ReminderLog[]>([])
  const [stats, setStats] = useState<ReminderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'upcoming'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [minDue, setMinDue] = useState('')
  const [maxDue, setMaxDue] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkDate, setBulkDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)

  const [editingTemplate, setEditingTemplate] = useState(false)
  const [bulkSubject, setBulkSubject] = useState('RG INFRA - Due Payment Reminder | {{apartment_name}}, Flat {{flat_unit}}')
  const [bulkTemplate, setBulkTemplate] = useState(`<p>Dear <strong>{{client_name}}</strong>,</p>
<p>This is a reminder that payment of <strong>Rs. {{due_amount}}</strong> is due for <strong>{{apartment_name}}, Flat {{flat_unit}}</strong>.</p>
<p><strong>Stage:</strong> {{projection_stage}}<br><strong>GST:</strong> Rs. {{gst_amount}}<br><strong>Total Payable:</strong> Rs. {{total_payable}}<br><strong>Due Date:</strong> {{due_date}}</p>
<p>Please arrange the payment as per the bank details shared by R G Infra. For support, contact +91 93347 00319.</p>`)

  // Send reminder modal
  const [sendModal, setSendModal] = useState<PendingDue | null>(null)
  const [attachDL, setAttachDL] = useState(false)
  const [sending, setSending] = useState(false)



  // Add Payment modal
  const [paymentModal, setPaymentModal] = useState<{ clientId: number; clientName: string; dueAmount: number } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState('bank_transfer')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [dueRows, logsData, statsData] = await Promise.all([
        api.getDueReminders(), api.getReminderLogs(), api.getReminderStats(),
      ])
      setPendingDues(dueRows.map(mapDueReminder))
      setLogs(logsData)
      setStats(statsData)
      setSelectedIds([])
    } catch { toast.push({ tone: 'error', title: 'Failed to load' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filteredDues = useMemo(() => pendingDues.filter((due) => {
    const q = search.toLowerCase().trim()
    const matchesSearch = !q || [
      due.client_name,
      due.unique_client_id,
      due.phone,
      due.email,
      due.apartment_name,
      due.flat_number,
    ].some((value) => String(value || '').toLowerCase().includes(q))
    const currentDue = due.current_due_date ? new Date(due.current_due_date) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const matchesDueFilter = dueFilter === 'all'
      || (dueFilter === 'overdue' ? !!currentDue && currentDue < today : !currentDue || currentDue >= today)
    const matchesDate = !dateFilter || due.current_due_date?.slice(0, 10) === dateFilter
    const amount = Number(due.combined_due || 0)
    const matchesMin = !minDue || amount >= Number(minDue)
    const matchesMax = !maxDue || amount <= Number(maxDue)
    return matchesSearch && matchesDueFilter && matchesDate && matchesMin && matchesMax
  }), [pendingDues, search, dueFilter, dateFilter, minDue, maxDue])

  const filteredLogs = useMemo(() => {
    const q = historySearch.toLowerCase().trim()
    if (!q) return logs
    return logs.filter(log =>
      [log.client_name, log.unique_client_id, log.flat_number, log.apartment_name, (log as any).stage_name]
        .some(v => String(v || '').toLowerCase().includes(q))
    )
  }, [logs, historySearch])

  const allFilteredSelected = filteredDues.length > 0 && filteredDues.every(due => selectedIds.includes(due.reminder_id))

  const toggleSelectAll = () => {
    setSelectedIds(allFilteredSelected ? [] : filteredDues.map(due => due.reminder_id))
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const handleBulkSend = async () => {
    setBulkSending(true)
    try {
      const res = await api.sendBulkDueEmails({
        ...(selectedIds.length ? { reminder_ids: selectedIds } : { due_date: bulkDate }),
        ...(editingTemplate ? { subject: bulkSubject, html_template: bulkTemplate } : {}),
      })
      toast.push({ tone: 'success', title: res.message })
      setBulkModal(false)
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Bulk email failed' })
    } finally {
      setBulkSending(false)
    }
  }



  const handleExport = async (format: 'xlsx' | 'pdf' = 'xlsx') => {
    try {
      const { blob, filename } = await api.exportDueReminderReport(format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.push({ tone: 'error', title: 'Export failed' })
    }
  }

  // Handle save payment
  const handleSavePayment = async () => {
    if (!paymentModal) return
    const amt = Number(paymentAmount)
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.push({ tone: 'error', title: 'Enter a valid amount' })
      return
    }
    setPaymentSaving(true)
    try {
      await api.addClientPayment({
        client_id: paymentModal.clientId,
        amount: amt,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        reference_no: paymentRef,
      })
      toast.push({ tone: 'success', title: 'Payment recorded successfully!' })
      setPaymentModal(null)
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to record payment' })
    } finally {
      setPaymentSaving(false)
    }
  }



  // Send enhanced reminder
  const handleSend = async () => {
    if (!sendModal) return
    setSending(true)
    try {
      const res = await api.sendEnhancedReminder(sendModal.client_id, attachDL)
      toast.push({ tone: 'success', title: res.message })
      setSendModal(null)
      setAttachDL(false)
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    } finally { setSending(false) }
  }




  // Download demand letter
  const handleDownloadDL = async (clientId: number) => {
    try {
      const res = await api.generateDemandLetter({ client_id: clientId, paid_amount: 0, send_email: false })
      window.open(res.file_url, '_blank')
      toast.push({ tone: 'success', title: 'Demand letter generated' })
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    }
  }

  const handleWhatsAppDue = async (due: PendingDue) => {
    if (!due.phone) {
      toast.push({ tone: 'error', title: 'Client phone missing' })
      return
    }
    try {
      const res = await api.generateDemandLetter({ client_id: due.client_id, paid_amount: 0, send_email: false, send_whatsapp: true })
      if (res.whatsapp_url) window.open(res.whatsapp_url, '_blank')
      toast.push({ tone: 'success', title: 'WhatsApp message opened' })
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    }
  }

  const statusBadge = (s: string) => {
    if (s === 'sent') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (s === 'failed') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-slate-50 text-slate-600 border-slate-200'
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Due Reminders</h1>
          <p className="text-sm text-slate-500 mt-1">Track dues by percentage, set due dates & send reminders</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PortalButton variant="outline" onClick={() => handleExport('xlsx')}><Download className="h-4 w-4" /> Export Excel</PortalButton>
          <PortalButton variant="outline" onClick={() => handleExport('pdf')}><FileText className="h-4 w-4" /> Export PDF</PortalButton>
          <PortalButton onClick={() => setBulkModal(true)}><Mail className="h-4 w-4" /> Send Bulk Email</PortalButton>
          <PortalButton variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</PortalButton>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Pending Dues', value: pendingDues.length, icon: Bell, color: 'orange' },
            { label: 'Emails Sent', value: stats.emails_sent || 0, icon: Mail, color: 'emerald' },
            { label: 'Total Reminders', value: stats.total_reminders || 0, icon: Send, color: 'blue' },
            { label: 'Sent Today', value: stats.sent_today || 0, icon: CheckCircle2, color: 'violet' },
          ].map((s, i) => (
            <PortalCard key={i}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-${s.color}-50 flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 text-${s.color}-500`} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">{s.label}</div>
                  <div className="text-xl font-extrabold text-slate-900">{s.value}</div>
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(['upcoming', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition ${tab === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'upcoming' ? `Upcoming Dues (${pendingDues.length})` : `Reminder History (${logs.length})`}
          </button>
        ))}
      </div>

      {/* ════ TAB: UPCOMING DUES ════ */}
      {tab === 'upcoming' && (
        <PortalCard>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="text-lg font-extrabold text-slate-900">Clients with Pending Dues</div>
            <div className="relative ml-auto min-w-[240px] flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by client, flat, phone, email..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:border-orange-400 focus:ring-2"
              />
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {([
                ['all', 'All'],
                ['overdue', 'Overdue'],
                ['upcoming', 'Upcoming'],
              ] as const).map(([value, label]) => (
                <button key={value} onClick={() => setDueFilter(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${dueFilter === value ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-orange-400/40 focus:border-orange-400 focus:ring-2"
              title="Filter by due date"
            />
            <input
              type="number"
              value={minDue}
              onChange={(e) => setMinDue(e.target.value)}
              placeholder="Min due"
              className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-orange-400/40 focus:border-orange-400 focus:ring-2"
            />
            <input
              type="number"
              value={maxDue}
              onChange={(e) => setMaxDue(e.target.value)}
              placeholder="Max due"
              className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-orange-400/40 focus:border-orange-400 focus:ring-2"
            />
          </div>
          {filteredDues.length === 0 ? (
            <EmptyState title="No pending dues" sub="All clients are up to date" />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <button onClick={toggleSelectAll} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                  {allFilteredSelected ? <CheckSquare className="h-4 w-4 text-orange-500" /> : <Square className="h-4 w-4 text-slate-400" />}
                  Select All ({filteredDues.length})
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{selectedIds.length} selected</span>
                  <PortalButton onClick={() => setBulkModal(true)} disabled={selectedIds.length === 0} className="!text-xs !px-3 !py-1.5">
                    <Mail className="h-3.5 w-3.5" /> Send Selected
                  </PortalButton>
                </div>
              </div>
              {filteredDues.map(due => (
                <div key={due.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 flex-wrap">
                    <button onClick={() => toggleSelect(due.reminder_id)} className="mt-1 text-slate-400 hover:text-orange-500" title="Select reminder">
                      {selectedIds.includes(due.reminder_id) ? <CheckSquare className="h-5 w-5 text-orange-500" /> : <Square className="h-5 w-5" />}
                    </button>
                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{due.client_name}</span>
                        <span className="text-xs text-slate-400 font-mono">{due.unique_client_id}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(due.email_status === 'not_sent' ? 'skipped' : due.email_status)}`}>
                          {due.email_status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {due.apartment_name && <span>🏠 {due.apartment_name}</span>}
                        {due.flat_number && <span>🚪 Flat {due.flat_number}</span>}
                        {due.email && <span>✉️ {due.email}</span>}
                      </div>
                      {/* Due Info - Simple percentage-based */}
                      <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                        {due.current_due_date && (
                          (() => {
                            const dueDate = new Date(due.current_due_date)
                            const today = new Date()
                            today.setHours(0,0,0,0)
                            const isOverdue = dueDate <= today
                            const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= 7 * 24 * 60 * 60 * 1000
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
                                isOverdue ? 'bg-red-50 border-red-200 text-red-700' : isDueSoon ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                {isOverdue ? 'OVERDUE' : isDueSoon ? 'DUE SOON' : 'Due'}: {dueDate.toLocaleDateString('en-IN')}
                              </span>
                            )
                          })()
                        )}
                        {due.current_stage_percentage && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-orange-700 font-semibold">
                            {due.current_stage_percentage}% — {inr(due.current_stage_due)}
                          </span>
                        )}
                        {due.next_due_date && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-700 font-semibold">
                            Next: {inr(due.next_stage_amount)} on {new Date(due.next_due_date).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                      {/* Progress */}
                      <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 max-w-xs">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                            style={{ width: `${due.total_flat_amount > 0 ? (due.total_paid / due.total_flat_amount) * 100 : 0}%` }} />
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-slate-400 font-semibold flex-wrap">
                          <span>{due.total_flat_amount > 0 ? Math.round((due.total_paid / due.total_flat_amount) * 100) : 0}% paid</span>
                          <span>Paid: {inr(due.total_paid)} / {inr(due.total_flat_amount)}</span>
                          <span>Base Due: {inr(due.total_due)}</span>
                          {Number(due.gst_amount || 0) > 0 && <span>GST: {inr(due.gst_amount)}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Due Amount */}
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">Due Now</div>
                      <div className="text-xl font-extrabold text-red-600">{inr(due.combined_due)}</div>
                      {Number(due.gst_amount || 0) > 0 && <div className="text-[10px] text-slate-400 mt-0.5">GST: {inr(due.gst_amount)}</div>}
                      <div className="text-[10px] text-slate-500 mt-0.5 font-bold">Payable: {inr(due.total_payable || due.combined_due)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <PortalButton onClick={() => {
                        const hasGst = Number(due.gst_amount || 0) > 0
                        const params = new URLSearchParams({
                          client_id: String(due.client_id),
                          amount: String(due.total_payable || due.combined_due || 0),
                          ...(hasGst ? { gst_inclusive: 'true' } : {}),
                        })
                        navigate(`/portal/payments?${params.toString()}`)
                      }} className="!text-xs !px-3 !py-1.5" variant="outline">
                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Add Payment
                      </PortalButton>
                      <PortalButton onClick={() => { setSendModal(due); setAttachDL(false) }} className="!text-xs !px-3 !py-1.5" variant="primary">
                        <Mail className="h-3.5 w-3.5" /> Send Reminder
                      </PortalButton>

                      <PortalButton onClick={() => handleDownloadDL(due.client_id)} className="!text-xs !px-3 !py-1.5" variant="outline">
                        <Download className="h-3.5 w-3.5" /> Demand Letter
                      </PortalButton>
                      <PortalButton onClick={() => handleWhatsAppDue(due)} className="!text-xs !px-3 !py-1.5" variant="outline">
                        <MessageCircle className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                      </PortalButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      )}

      {/* ════ TAB: HISTORY ════ */}
      {tab === 'history' && (
        <PortalCard>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="text-lg font-extrabold text-slate-900">Reminder History ({logs.length})</div>
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search client, flat..."
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:border-orange-400 focus:ring-2"
              />
            </div>
          </div>
          {filteredLogs.length === 0 ? (
            <EmptyState title="No reminders sent yet" sub="Send due reminders from the Upcoming Dues tab" />
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div key={log.id} className="rounded-xl border border-slate-100 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${log.trigger_type === 'cron' ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'}`}>
                      {log.trigger_type === 'cron' ? <Clock className="h-4 w-4 text-blue-500" /> : <Send className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{log.client_name || 'Unknown'}</span>
                        <span className="text-xs text-slate-400 font-mono">{log.unique_client_id}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(log.email_status)}`}>
                          {log.email_status}
                        </span>
                        {log.demand_letter_id && (
                          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase">
                            + Demand Letter
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {log.apartment_name && <span>🏠 {log.apartment_name}</span>}
                        {log.flat_number && <span>🚪 Flat {log.flat_number}</span>}
                        {(log as any).stage_name && <span>📋 {(log as any).stage_name}</span>}
                        {log.due_date && <span>📅 Due: {new Date(log.due_date).toLocaleDateString('en-IN')}</span>}
                        <span>💰 Amount: {inr(log.combined_due)}</span>
                      </div>
                      {log.demand_letter_file && (
                        <a href={log.demand_letter_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700">
                          <FileText className="h-3.5 w-3.5" /> {log.demand_letter_file}
                        </a>
                      )}
                      {log.error_message && <div className="mt-1 text-xs text-red-500 font-medium">❌ {log.error_message}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-red-600">{inr(log.combined_due)}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {log.sent_on ? new Date(log.sent_on).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      )}

      {/* ════ SEND REMINDER MODAL ════ */}
      <Modal open={!!sendModal} onClose={() => setSendModal(null)} title={`Send Due Reminder — ${sendModal?.client_name || ''}`}>
        {sendModal && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Property</div>
                  <div className="font-bold text-slate-800">{sendModal.apartment_name}, Flat {sendModal.flat_number}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Email</div>
                  <div className="font-bold text-slate-800">{sendModal.email || <span className="text-red-500">No email</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Paid</div>
                  <div className="font-bold text-emerald-600">{inr(sendModal.total_paid)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Due Now</div>
                  <div className="font-bold text-red-600">{inr(sendModal.combined_due)}</div>
                </div>
              </div>
            </div>

            {/* Attach Demand Letter Toggle */}
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition">
              <input type="checkbox" checked={attachDL} onChange={e => setAttachDL(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-bold text-slate-700">Attach Demand Letter PDF</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {attachDL
                    ? 'Demand letter PDF will be generated & attached. Email template will NOT mention "demand letter attached".'
                    : 'Plain due reminder email will be sent without any attachment.'}
                </p>
              </div>
            </label>

            {/* Template Preview */}
            <div className={`rounded-xl border p-3 text-xs ${attachDL ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <strong>Template:</strong> {attachDL
                ? 'Payment Due Notice (formal, with PDF attached, no "attached" mention in body)'
                : 'Due Payment Reminder (friendly reminder, no attachment)'}
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setSendModal(null)}>Cancel</PortalButton>
          <PortalButton onClick={handleSend} disabled={sending || !sendModal?.email}>
            {sending ? 'Sending...' : attachDL ? 'Send with Demand Letter' : 'Send Reminder Email'}
          </PortalButton>
        </div>
      </Modal>

      {/* ════ BULK EMAIL MODAL ════ */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Send Bulk Due Emails">
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            {selectedIds.length > 0
              ? `Send reminder emails to ${selectedIds.length} selected client(s).`
              : 'Choose a due date and the system will send reminders to every unpaid client due on that date.'}
          </div>
          {selectedIds.length === 0 && (
            <Input label="Due Date" type="date" value={bulkDate} onChange={setBulkDate} />
          )}
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
            Select all filtered reminders
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={editingTemplate} onChange={(e) => setEditingTemplate(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
            Edit email template for this send
          </label>
          {editingTemplate && (
            <div className="space-y-3">
              <Input label="Email Subject" value={bulkSubject} onChange={setBulkSubject} />
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500">HTML Template</label>
                <textarea
                  value={bulkTemplate}
                  onChange={(e) => setBulkTemplate(e.target.value)}
                  rows={8}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
                />
                <div className="mt-1 text-xs text-slate-400">Use placeholders like {'{{client_name}}'}, {'{{flat_unit}}'}, {'{{due_amount}}'}, {'{{gst_amount}}'}, {'{{total_payable}}'}, {'{{due_date}}'}.</div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setBulkModal(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleBulkSend} disabled={bulkSending || (selectedIds.length === 0 && !bulkDate)}>
            {bulkSending ? 'Sending...' : 'Confirm & Send Bulk Email'}
          </PortalButton>
        </div>
      </Modal>



      {/* ════ ADD PAYMENT MODAL ════ */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title={`Add Payment — ${paymentModal?.clientName || ''}`}>
        <div className="space-y-4">
          <Input label="Amount Paid (₹)" type="number" value={paymentAmount} onChange={setPaymentAmount} placeholder="0.00" />
          <Input label="Payment Date" type="date" value={paymentDate} onChange={setPaymentDate} />
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <Input label="Reference No. / Cheque No." value={paymentRef} onChange={setPaymentRef} placeholder="Optional" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setPaymentModal(null)}>Cancel</PortalButton>
          <PortalButton onClick={handleSavePayment} disabled={paymentSaving}>
            {paymentSaving ? 'Saving...' : 'Save Payment'}
          </PortalButton>
        </div>
      </Modal>

    </div>
  )
}
