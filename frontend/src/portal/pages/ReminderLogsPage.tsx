import { useEffect, useMemo, useState } from 'react'
import { Bell, Mail, FileText, Download, Clock, CheckCircle2, RefreshCw, Calendar, Send, Paperclip, Search, MessageCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { api, type PendingDue, type ReminderLog, type ReminderStats } from '../api'
import { usePortalToast } from '../toast'
import { PortalCard, PortalButton, Modal, EmptyState, inr } from '../ui'

type Tab = 'upcoming' | 'history'

export function ReminderLogsPage() {
  const toast = usePortalToast()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [pendingDues, setPendingDues] = useState<PendingDue[]>([])
  const [logs, setLogs] = useState<ReminderLog[]>([])
  const [stats, setStats] = useState<ReminderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'upcoming'>('all')

  // Send reminder modal
  const [sendModal, setSendModal] = useState<PendingDue | null>(null)
  const [attachDL, setAttachDL] = useState(false)
  const [sending, setSending] = useState(false)

  // Due date modal
  const [dateModal, setDateModal] = useState<{ clientId: number; clientName: string } | null>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [initialSchedules, setInitialSchedules] = useState<any[]>([])
  const [dateLoading, setDateLoading] = useState(false)
  const [savingScheduleChanges, setSavingScheduleChanges] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [dues, logsData, statsData] = await Promise.all([
        api.getPendingDues(), api.getReminderLogs(), api.getReminderStats(),
      ])
      setPendingDues(dues)
      setLogs(logsData)
      setStats(statsData)
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
    return matchesSearch && matchesDueFilter
  }), [pendingDues, search, dueFilter])

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

  // Open due date editor
  const openDateEditor = async (clientId: number, clientName: string) => {
    setDateModal({ clientId, clientName })
    setDateLoading(true)
    try {
      const data = await api.getClientSchedule(clientId)
      setSchedules(data)
      setInitialSchedules(data)
    } catch { toast.push({ tone: 'error', title: 'Failed to load schedule' }) }
    finally { setDateLoading(false) }
  }

  // Format date to local YYYY-MM-DD for the input
  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 10);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr.slice(0, 10);
    }
  }

  const hasScheduleChanges = useMemo(() => {
    if (!initialSchedules.length || schedules.length === 0) return false
    return schedules.some((schedule) => {
      const base = initialSchedules.find((item) => item.id === schedule.id)
      if (!base) return true
      const nextDue = formatDateForInput(schedule.due_date)
      const prevDue = formatDateForInput(base.due_date)
      const nextPct = Number(schedule.percentage)
      const prevPct = Number(base.percentage)
      const pctChanged = !Number.isNaN(nextPct) && nextPct !== prevPct
      return nextDue !== prevDue || pctChanged
    })
  }, [schedules, initialSchedules])

  const saveScheduleChanges = async () => {
    if (!dateModal) return

    const changes: Array<{ type: 'due' | 'pct'; id: number; value: string | number }> = []
    for (const schedule of schedules) {
      const base = initialSchedules.find((item) => item.id === schedule.id)
      if (!base) continue

      const nextDue = formatDateForInput(schedule.due_date)
      const prevDue = formatDateForInput(base.due_date)
      if (nextDue !== prevDue) {
        changes.push({ type: 'due', id: schedule.id, value: nextDue })
      }

      const nextPct = Number(schedule.percentage)
      const prevPct = Number(base.percentage)
      if (!Number.isNaN(nextPct) && nextPct !== prevPct) {
        changes.push({ type: 'pct', id: schedule.id, value: nextPct })
      }
    }

    if (!changes.length) {
      toast.push({ tone: 'info', title: 'No changes to save' })
      return
    }

    const invalidPct = changes.find((change) => change.type === 'pct' && (Number(change.value) < 0 || Number(change.value) > 100))
    if (invalidPct) {
      toast.push({ tone: 'error', title: 'Invalid percentage value' })
      return
    }

    setSavingScheduleChanges(true)
    try {
      for (const change of changes) {
        if (change.type === 'due') {
          await api.setScheduleDueDate(change.id, String(change.value))
        } else {
          await api.setSchedulePercentage(change.id, Number(change.value))
        }
      }

      const data = await api.getClientSchedule(dateModal.clientId)
      setSchedules(data)
      setInitialSchedules(data)
      load()
      toast.push({ tone: 'success', title: 'Schedule changes saved' })
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to save changes' })
      setSchedules(initialSchedules)
    } finally {
      setSavingScheduleChanges(false)
    }
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
        <PortalButton variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</PortalButton>
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
          </div>
          {filteredDues.length === 0 ? (
            <EmptyState title="No pending dues" sub="All clients are up to date" />
          ) : (
            <div className="space-y-3">
              {filteredDues.map(due => (
                <div key={due.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{due.client_name}</span>
                        <span className="text-xs text-slate-400 font-mono">{due.unique_client_id}</span>
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
                        <div className="flex gap-3 mt-1 text-[10px] text-slate-400 font-semibold">
                          <span>{due.total_flat_amount > 0 ? Math.round((due.total_paid / due.total_flat_amount) * 100) : 0}% paid</span>
                          <span>Paid: {inr(due.total_paid)} / {inr(due.total_flat_amount)}</span>
                          <span>Remaining: {inr(due.total_due)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Due Amount */}
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">Due Now</div>
                      <div className="text-xl font-extrabold text-red-600">{inr(due.combined_due)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Total Remaining: {inr(due.total_due)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <PortalButton onClick={() => openDateEditor(due.client_id, due.client_name)} className="!text-xs !px-3 !py-1.5" variant="outline">
                        <Calendar className="h-3.5 w-3.5" /> Set Due Date
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
          <div className="text-lg font-extrabold text-slate-900 mb-4">Reminder History ({logs.length})</div>
          {logs.length === 0 ? (
            <EmptyState title="No reminders sent yet" sub="Send due reminders from the Upcoming Dues tab" />
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="rounded-xl border border-slate-100 bg-white p-4 hover:shadow-sm transition-shadow">
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
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {log.apartment_name && <span>🏠 {log.apartment_name}</span>}
                        {log.flat_number && <span>🚪 Flat {log.flat_number}</span>}
                        {log.due_date && <span>📅 Due: {new Date(log.due_date).toLocaleDateString('en-IN')}</span>}
                        <span>💰 Due: {inr(log.combined_due)}</span>
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

      {/* ════ DUE DATE EDITOR MODAL ════ */}
      <Modal open={!!dateModal} onClose={() => setDateModal(null)} title={`Set Due Dates — ${dateModal?.clientName || ''}`} wide>
        {dateLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">No payment schedule found for this client.</p>
            <PortalButton onClick={async () => {
              if (!dateModal) return
              try {
                await api.generateSchedule(dateModal.clientId)
                toast.push({ tone: 'success', title: 'Schedule generated!' })
                const data = await api.getClientSchedule(dateModal.clientId)
                setSchedules(data)
                load()
              } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
            }}>Generate Schedule</PortalButton>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s: any) => (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl border p-3 ${
                s.status === 'paid' ? 'border-emerald-200 bg-emerald-50/30' : s.status === 'partial' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'
              }`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  s.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : s.status === 'partial' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {s.stage_order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <input 
                      type="number"
                      className="w-14 text-center border-b border-dashed border-slate-300 text-orange-600 bg-transparent outline-none focus:border-orange-500 appearance-none m-0 p-0 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                      value={s.percentage}
                      onChange={(e) => setSchedules(prev => prev.map(sch => sch.id === s.id ? { ...sch, percentage: e.target.value } : sch))}
                      disabled={s.status === 'paid'}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                    <span className="text-slate-500 font-normal">%</span>
                    <span className="text-slate-300 mx-1">—</span>
                    <span className="text-slate-600 font-semibold">{inr(s.amount)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {s.status === 'paid' ? (
                      <span className="text-emerald-600 font-bold">✓ Fully Paid</span>
                    ) : s.status === 'partial' ? (
                      <span className="text-amber-600 font-bold">Partial — Paid: {inr(s.paid_amount)}, Due: {inr(s.due_amount)}</span>
                    ) : (
                      <span className="text-red-600 font-bold">Pending — Due: {inr(s.due_amount)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">DUE DATE</label>
                  <div className="flex items-center gap-2">
                    {s.due_date && s.status !== 'paid' && (
                      <>
                        {new Date(s.due_date) <= new Date() ? (
                          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> OVERDUE
                          </span>
                        ) : new Date(s.due_date).getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000 ? (
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> DUE SOON
                          </span>
                        ) : null}
                      </>
                    )}
                    <input
                      type="date"
                      value={formatDateForInput(s.due_date)}
                      onChange={e => setSchedules(prev => prev.map(sch => sch.id === s.id ? { ...sch, due_date: e.target.value } : sch))}
                      disabled={s.status === 'paid'}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 disabled:opacity-40"
                    />
                  </div>
                </div>
                {/* Delete button */}
                {s.status !== 'paid' && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete this schedule row (${s.percentage}% — ${inr(s.amount)})? This cannot be undone.`)) return
                      try {
                        await api.deleteSchedule(s.id)
                        toast.push({ tone: 'success', title: 'Schedule deleted' })
                        const data = await api.getClientSchedule(dateModal!.clientId)
                        setSchedules(data)
                        setInitialSchedules(data)
                        load()
                      } catch (e) {
                        toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to delete' })
                      }
                    }}
                    className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Delete this schedule row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {/* Total percentage indicator */}
            {(() => {
              const totalPct = schedules.reduce((sum: number, s: any) => sum + (Number(s.percentage) || 0), 0)
              return (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${
                  Math.abs(totalPct - 100) < 0.01 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {Math.abs(totalPct - 100) < 0.01 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  Total: {totalPct.toFixed(2)}% {Math.abs(totalPct - 100) < 0.01 ? '✓' : '(should be 100%)'}
                </div>
              )
            })()}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setDateModal(null)}>Close</PortalButton>
          <PortalButton onClick={saveScheduleChanges} disabled={!hasScheduleChanges || savingScheduleChanges}>
            {savingScheduleChanges ? 'Saving...' : 'Save Changes'}
          </PortalButton>
        </div>
      </Modal>
    </div>
  )
}
