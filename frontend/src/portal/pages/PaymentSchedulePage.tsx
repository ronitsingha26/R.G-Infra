/**
 * RG INFRA — Payment Schedule Page
 * Admin defines stages, generates schedules, records payments, views dues
 */

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, IndianRupee, AlertTriangle, Clock, Calendar, Search, Trash2, Plus } from 'lucide-react'
import { api, type PendingDue, type Client } from '../api'
import { usePortalToast } from '../toast'
import { PortalCard, PortalButton, Modal, Input, EmptyState, inr } from '../ui'

export function PaymentSchedulePage() {
  const toast = usePortalToast()
  const [pendingDues, setPendingDues] = useState<PendingDue[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  // Filters for client schedule
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [scheduleProp, setScheduleProp] = useState('')
  const [scheduleApt, setScheduleApt] = useState('')
  const [scheduleFlat, setScheduleFlat] = useState('')

  // Pay modal state
  const [payModal, setPayModal] = useState<PendingDue | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payPercentage, setPayPercentage] = useState('')
  const [payMode, setPayMode] = useState('')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paying, setPaying] = useState(false)

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return ''
    return String(Math.round(value * 100) / 100)
  }

  // Due date editor state
  const [dueDateModal, setDueDateModal] = useState<{ clientId: number; clientName: string } | null>(null)
  const [clientSchedules, setClientSchedules] = useState<any[]>([])
  const [initialClientSchedules, setInitialClientSchedules] = useState<any[]>([])
  const [dueDateLoading, setDueDateLoading] = useState(false)
  const [savingScheduleChanges, setSavingScheduleChanges] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [duesData, clientsData] = await Promise.all([
        api.getPendingDues(),
        api.getClients(),
      ])
      setPendingDues(duesData)
      setClients(clientsData)
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ─── Pay Modal ─────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!payModal || !payAmount) return
    setPaying(true)
    try {
      await api.addClientPayment({
        client_id: payModal.client_id,
        amount: payAmount ? Number(payAmount) : undefined,
        payment_percentage: payPercentage ? Number(payPercentage) : undefined,
        payment_mode: payMode || undefined,
        reference_no: payRef || undefined,
        notes: payNotes || undefined,
      })
      toast.push({ tone: 'success', title: `Payment of ${inr(payAmount)} recorded!` })
      setPayModal(null)
      setPayAmount('')
      setPayPercentage('')
      setPayMode('')
      setPayRef('')
      setPayNotes('')
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Payment failed' })
    } finally {
      setPaying(false)
    }
  }

  // ─── Generate Schedule ─────────────────────────────────────────────────────
  const generateSchedule = async (clientId: number) => {
    try {
      await api.generateSchedule(clientId)
      toast.push({ tone: 'success', title: 'Schedule generated!' })
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    }
  }

  // ─── Due Date Editor ──────────────────────────────────────────────────────
  const openDueDateEditor = async (clientId: number, clientName: string) => {
    setDueDateModal({ clientId, clientName })
    setDueDateLoading(true)
    try {
      const data = await api.getClientSchedule(clientId)
      setClientSchedules(data)
      setInitialClientSchedules(data)
    } catch { toast.push({ tone: 'error', title: 'Failed to load schedules' }) }
    finally { setDueDateLoading(false) }
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
    if (!initialClientSchedules.length || clientSchedules.length === 0) return false
    return clientSchedules.some((schedule) => {
      const base = initialClientSchedules.find((item) => item.id === schedule.id)
      if (!base) return true
      const nextDue = formatDateForInput(schedule.due_date)
      const prevDue = formatDateForInput(base.due_date)
      const nextPct = Number(schedule.percentage)
      const prevPct = Number(base.percentage)
      const pctChanged = !Number.isNaN(nextPct) && nextPct !== prevPct
      return nextDue !== prevDue || pctChanged
    })
  }, [clientSchedules, initialClientSchedules])

  const filteredDues = useMemo(() => {
    return pendingDues.filter((due) => {
      const search = scheduleSearch.toLowerCase();
      if (search && !due.client_name?.toLowerCase().includes(search) && !due.unique_client_id?.toLowerCase().includes(search) && !due.phone?.includes(search)) return false;
      if (scheduleApt && due.apartment_name !== scheduleApt) return false;
      if (scheduleFlat && !due.flat_number?.toLowerCase().includes(scheduleFlat.toLowerCase())) return false;
      return true;
    });
  }, [pendingDues, scheduleSearch, scheduleApt, scheduleFlat]);

  const saveScheduleChanges = async () => {
    if (!dueDateModal) return

    const changes: Array<{ type: 'due' | 'pct'; id: number; value: string | number }> = []
    for (const schedule of clientSchedules) {
      const base = initialClientSchedules.find((item) => item.id === schedule.id)
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

      const data = await api.getClientSchedule(dueDateModal.clientId)
      setClientSchedules(data)
      setInitialClientSchedules(data)
      load()
      toast.push({ tone: 'success', title: 'Schedule changes saved' })
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to save changes' })
      setClientSchedules(initialClientSchedules)
    } finally {
      setSavingScheduleChanges(false)
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Payment Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">Manage client payment schedules & track dues</p>
        </div>
        <PortalButton variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</PortalButton>
      </div>

      {/* Manage Any Client's Schedule */}
      <PortalCard>
        <div className="mb-4">
          <div className="text-lg font-extrabold text-slate-900">Manage Client Schedules</div>
          <div className="text-sm text-slate-500 mt-1">Generate or edit payment schedules for any client, even without pending dues.</div>
        </div>
        
        {(() => {
          const availableProps = Array.from(new Set(clients.map(c => c.property_name).filter(Boolean))) as string[]
          const availableApts = Array.from(new Set(clients.map(c => c.apartment_name).filter(Boolean))) as string[]
          
          const filteredClients = clients.filter(c => {
            const search = scheduleSearch.toLowerCase();
            if (search && !c.name.toLowerCase().includes(search) && !c.unique_client_id?.toLowerCase().includes(search) && !c.phone?.includes(search)) return false;
            if (scheduleProp && c.property_name !== scheduleProp) return false;
            if (scheduleApt && c.apartment_name !== scheduleApt) return false;
            if (scheduleFlat && !c.flat_number?.toLowerCase().includes(scheduleFlat.toLowerCase())) return false;
            return true;
          });

          return (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search client..." 
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
                  value={scheduleSearch} 
                  onChange={e => setScheduleSearch(e.target.value)} 
                />
              </div>

              <select 
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400" 
                value={scheduleProp} 
                onChange={e => setScheduleProp(e.target.value)}
              >
                <option value="">All Properties</option>
                {availableProps.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <select 
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400" 
                value={scheduleApt} 
                onChange={e => setScheduleApt(e.target.value)}
              >
                <option value="">All Apartments</option>
                {availableApts.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              <input 
                type="text"
                placeholder="Flat number..." 
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
                value={scheduleFlat} 
                onChange={e => setScheduleFlat(e.target.value)} 
              />

              <select
                className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 outline-none focus:border-orange-500 cursor-pointer"
                onChange={(e) => {
                  const c = clients.find(cl => cl.id === Number(e.target.value))
                  if (c) {
                    openDueDateEditor(c.id, c.name)
                    e.target.value = "" // reset select
                  }
                }}
                value=""
              >
                <option value="" disabled>Select Client ({filteredClients.length})</option>
                {filteredClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.apartment_name ? `— ${c.apartment_name} (${c.flat_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )
        })()}
      </PortalCard>

      {/* Pending Dues */}
      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">
          Pending Dues ({filteredDues.length})
        </div>
        {filteredDues.length === 0 ? (
          <EmptyState title="No pending dues" sub="All payments are up to date (or try changing filters)" />
        ) : (
          <div className="space-y-3">
            {filteredDues.map((due) => {
              const currentDue = Number(due.current_due ?? due.current_stage_due ?? due.combined_due ?? 0)
              const baseNext = Number(due.next_stage_amount ?? 0)
              const nextInstallment = Number(due.next_installment_amount ?? due.next_stage_amount ?? 0)
              const carryOver = Math.max(0, nextInstallment - baseNext)
              const gstAmount = Number(due.gst_amount || 0)
              const totalPayable = Number(due.total_payable ?? currentDue + gstAmount)

              return (
              <div key={due.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{due.client_name}</span>
                      <span className="text-xs text-slate-400 font-mono">{due.unique_client_id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      {due.apartment_name && <span>🏠 {due.apartment_name}</span>}
                      {due.flat_number && <span>🚪 Flat {due.flat_number}</span>}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Last Payment</div>
                        <div className="font-bold text-emerald-600">{inr(due.total_paid)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Next Installment</div>
                        <div className="font-bold text-slate-800">{due.next_stage_name || 'No upcoming stage'}</div>
                        {nextInstallment > 0 && <div className="text-xs text-slate-500">{inr(nextInstallment)}</div>}
                        {carryOver > 0 && (
                          <div className="text-[11px] text-amber-600 font-semibold">Includes previous due {inr(carryOver)}</div>
                        )}
                        {due.next_due_date && <div className="text-xs text-slate-500">Due on {new Date(due.next_due_date).toLocaleDateString('en-IN')}</div>}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Pending Amount</div>
                        <div className="font-extrabold text-red-600">{inr(currentDue)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Total Payable</div>
                        {gstAmount > 0 && (
                          <div className="text-xs text-slate-500">GST ({Number(due.gst_percent || 0)}%): {inr(gstAmount)}</div>
                        )}
                        <div className="font-extrabold text-slate-900">{inr(totalPayable)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
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
                      {currentDue > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-orange-700 font-semibold">
                          Current pending: {inr(currentDue)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">Pending Now</div>
                    <div className="text-xl font-extrabold text-red-600">{inr(currentDue)}</div>
                    {gstAmount > 0 && <div className="text-xs text-slate-500 mt-1">GST: {inr(gstAmount)}</div>}
                    <div className="text-xs font-bold text-slate-700">Payable: {inr(totalPayable)}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Paid: <span className="text-emerald-600 font-bold">{inr(due.total_paid)}</span> / {inr(due.total_flat_amount)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <PortalButton
                      variant="primary"
                      onClick={() => { setPayModal(due); setPayAmount(''); setPayPercentage('') }}
                      className="!text-xs !px-3 !py-1.5"
                    >
                      <IndianRupee className="h-3.5 w-3.5" /> Pay
                    </PortalButton>
                    <PortalButton
                      variant="outline"
                      onClick={() => openDueDateEditor(due.client_id, due.client_name)}
                      className="!text-xs !px-3 !py-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" /> Due Dates
                    </PortalButton>
                  </div>
                </div>

                {/* Due Progress Bar */}
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                      style={{ width: `${due.total_flat_amount > 0 ? (due.total_paid / due.total_flat_amount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] font-semibold text-slate-400">
                    <span>{due.total_flat_amount > 0 ? Math.round((due.total_paid / due.total_flat_amount) * 100) : 0}% paid</span>
                    <span>{inr(due.total_due)} remaining</span>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </PortalCard>

      {/* ─── Payment Modal ─── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.client_name || ''}`}>
        {payModal && (() => {
          const currentDue = Number(payModal.current_due ?? payModal.current_stage_due ?? payModal.combined_due ?? 0)
          const gstAmount = Number(payModal.gst_amount || 0)
          const totalPayable = Number(payModal.total_payable ?? currentDue + gstAmount)

          return (
          <div className="space-y-4">
            {/* Due Summary */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Flat Amount</div>
                  <div className="font-bold text-slate-800">{inr(payModal.total_flat_amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Paid So Far</div>
                  <div className="font-bold text-emerald-600">{inr(payModal.total_paid)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Pending Amount</div>
                  <div className="font-bold text-amber-600">{payModal.current_stage_name}: {inr(currentDue)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Total Payable</div>
                  {gstAmount > 0 && <div className="text-xs text-slate-500">GST ({Number(payModal.gst_percent || 0)}%): {inr(gstAmount)}</div>}
                  <div className="font-bold text-red-600">{inr(totalPayable)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Payment Percentage (%)"
                value={payPercentage}
                onChange={(v) => {
                  if (!v) return setPayPercentage('')
                  const pct = Number(v)
                  setPayPercentage(v)
                  if (!payModal.total_flat_amount || Number.isNaN(pct)) return
                  const amount = (Number(payModal.total_flat_amount) * pct) / 100
                  setPayAmount(formatNumber(amount))
                }}
                type="number"
                placeholder="e.g. 5"
              />
              <Input
                label="Payment Amount (₹)"
                value={payAmount}
                onChange={(v) => {
                  if (!v) {
                    setPayAmount('')
                    setPayPercentage('')
                    return
                  }
                  const amt = Number(v)
                  setPayAmount(v)
                  if (!payModal.total_flat_amount || Number.isNaN(amt) || Number(payModal.total_flat_amount) === 0) return
                  const pct = (amt / Number(payModal.total_flat_amount)) * 100
                  setPayPercentage(formatNumber(pct))
                }}
                type="number"
                placeholder="Enter amount"
                required
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2">
              {currentDue > 0 && (
                <button
                  onClick={() => {
                    const amt = Number(currentDue)
                    setPayAmount(String(amt))
                    if (payModal.total_flat_amount > 0) {
                      setPayPercentage(formatNumber((amt / payModal.total_flat_amount) * 100))
                    }
                  }}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                >
                  Pending Amount: {inr(currentDue)}
                </button>
              )}
              <button
                onClick={() => {
                  const amt = Number(currentDue)
                  setPayAmount(String(amt))
                  if (payModal.total_flat_amount > 0) {
                    setPayPercentage(formatNumber((amt / payModal.total_flat_amount) * 100))
                  }
                }}
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
              >
                Pending Now: {inr(currentDue)}
              </button>
              <button
                onClick={() => {
                  const amt = Number(payModal.total_due)
                  setPayAmount(String(amt))
                  if (payModal.total_flat_amount > 0) {
                    setPayPercentage(formatNumber((amt / payModal.total_flat_amount) * 100))
                  }
                }}
                className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Full: {inr(payModal.total_due)}
              </button>
            </div>

            {/* Auto-calculated percentage */}
            {payAmount && payModal.total_flat_amount > 0 && (
              <div className="text-xs text-slate-500">
                = <span className="font-bold text-orange-600">{((Number(payAmount) / payModal.total_flat_amount) * 100).toFixed(2)}%</span> of total flat amount
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="Payment Mode" value={payMode} onChange={setPayMode} placeholder="e.g. NEFT, Cash, UPI" />
              <Input label="Reference No." value={payRef} onChange={setPayRef} placeholder="Transaction ID" />
            </div>
            <Input label="Notes" value={payNotes} onChange={setPayNotes} placeholder="Optional notes" />
          </div>
          )
        })()}
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setPayModal(null)}>Cancel</PortalButton>
          <PortalButton onClick={handlePay} disabled={paying || !payAmount}>
            {paying ? 'Recording...' : `Record Payment ${payAmount ? inr(payAmount) : ''}`}
          </PortalButton>
        </div>
      </Modal>

      {/* ─── Due Date Editor Modal ─── */}
      <Modal open={!!dueDateModal} onClose={() => setDueDateModal(null)} title={`Set Due Dates — ${dueDateModal?.clientName || ''}`} wide>
        {dueDateLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
        ) : clientSchedules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">No schedule found. Generate one first.</p>
            <PortalButton onClick={async () => {
              if (!dueDateModal) return
              await generateSchedule(dueDateModal.clientId)
              const data = await api.getClientSchedule(dueDateModal.clientId)
              setClientSchedules(data)
              setInitialClientSchedules(data)
            }}>Generate Schedule</PortalButton>
          </div>
        ) : (
          <div className="space-y-2">
            {clientSchedules.map((s: any) => (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl border p-3 ${
                s.status === 'paid' ? 'border-emerald-200 bg-emerald-50/30' : s.status === 'partial' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'
              }`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  s.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : s.status === 'partial' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}>{s.stage_order}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <input 
                      type="number"
                      className="w-14 text-center border-b border-dashed border-slate-300 text-orange-600 bg-transparent outline-none focus:border-orange-500 appearance-none m-0 p-0 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                      value={s.percentage}
                      onChange={(e) => setClientSchedules(prev => prev.map(sch => sch.id === s.id ? { ...sch, percentage: e.target.value } : sch))}
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
                      onChange={e => setClientSchedules(prev => prev.map(sch => sch.id === s.id ? { ...sch, due_date: e.target.value } : sch))}
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
                        const data = await api.getClientSchedule(dueDateModal!.clientId)
                        setClientSchedules(data)
                        setInitialClientSchedules(data)
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
              const totalPct = clientSchedules.reduce((sum: number, s: any) => sum + (Number(s.percentage) || 0), 0)
              return (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${
                  Math.abs(totalPct - 100) < 0.01 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {Math.abs(totalPct - 100) < 0.01 ? '✅' : '⚠️'}
                  Total: {totalPct.toFixed(2)}% {Math.abs(totalPct - 100) < 0.01 ? '✓' : '(should be 100%)'}
                </div>
              )
            })()}
            
            {/* Add New Stage Button */}
            <div className="flex justify-center mt-4 border-t border-slate-100 pt-4">
              <PortalButton 
                variant="outline" 
                onClick={async () => {
                  if (!dueDateModal) return;
                  const pct = prompt("Enter percentage for the new stage (e.g. 10):", "10");
                  if (pct === null) return;
                  const percentage = parseFloat(pct);
                  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
                    toast.push({ tone: 'error', title: 'Invalid percentage entered' });
                    return;
                  }
                  try {
                    await api.addClientScheduleStage(dueDateModal.clientId, { percentage });
                    toast.push({ tone: 'success', title: 'New stage added' });
                    const data = await api.getClientSchedule(dueDateModal.clientId);
                    setClientSchedules(data);
                    setInitialClientSchedules(data);
                    load();
                  } catch (e) {
                    toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to add stage' });
                  }
                }}
                className="!text-xs !py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Stage
              </PortalButton>
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setDueDateModal(null)}>Close</PortalButton>
          <PortalButton onClick={saveScheduleChanges} disabled={!hasScheduleChanges || savingScheduleChanges}>
            {savingScheduleChanges ? 'Saving...' : 'Save Changes'}
          </PortalButton>
        </div>
      </Modal>
    </div>
  )
}
