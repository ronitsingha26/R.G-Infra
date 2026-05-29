/**
 * R.G INFRA CRM — Work Projection Client Page (All-in-One Dashboard)
 * 
 * Single-page workflow for aged users. Every action happens here:
 * - Client Summary
 * - Construction Progress
 * - Update Work Projection (with auto demand letter + reminder)
 * - Generated Due Details
 * - Demand Letters
 * - Payment Reminders
 * - Combined Timeline
 */

import {
  AlertTriangle, ArrowLeft, Bell, Calendar, CheckCircle2, ChevronDown, ChevronUp,
  Circle, Clock, Download, Eye, FileText, HardHat, ImagePlus,
  Mail, MessageCircle, Pencil, Save, Send, Trash2, Upload, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  api, type WorkProjectionSummary, type WorkProjection,
  type DemandLetter, type ReminderLog, type CommunicationLog, type ClientPayment,
} from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Modal, PortalButton, PortalCard, Textarea } from '../ui'

// ════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════════════════════════════════════════
export function WorkProjectionClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const cid = Number(clientId)
  const navigate = useNavigate()
  const toast = usePortalToast()

  // ── Data states ──
  const [data, setData] = useState<WorkProjectionSummary | null>(null)
  const [demandLetters, setDemandLetters] = useState<DemandLetter[]>([])
  const [reminders, setReminders] = useState<ReminderLog[]>([])
  const [communications, setCommunications] = useState<CommunicationLog[]>([])
  const [payments, setPayments] = useState<ClientPayment[]>([])
  const [loading, setLoading] = useState(true)

  // ── Form state ──
  const [selectedMilestone, setSelectedMilestone] = useState('')
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [autoSendEmail, setAutoSendEmail] = useState(true)
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Edit state ──
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // ── Delete / Image preview ──
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // ── Section collapse state ──
  const [dueOpen, setDueOpen] = useState(true)
  const [demandOpen, setDemandOpen] = useState(true)
  const [reminderOpen, setReminderOpen] = useState(true)
  const [timelineOpen, setTimelineOpen] = useState(true)

  // ── Action states ──
  const [sendingReminder, setSendingReminder] = useState(false)
  const [generatingDL, setGeneratingDL] = useState(false)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)

  // ── Load all data ──
  const loadAll = async () => {
    try {
      setLoading(true)
      const [summary, dls, rems, comms, pays] = await Promise.all([
        api.getWorkProjectionSummary(cid),
        api.getClientDemandLetters(cid).catch(() => []),
        api.getClientReminderLogs(cid).catch(() => []),
        api.getClientCommunications(cid).catch(() => []),
        api.getClientPaymentHistory(cid).catch(() => []),
      ])
      setData(summary)
      setDemandLetters(dls)
      setReminders(rems)
      setCommunications(comms)
      setPayments(pays)
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [clientId])

  // ── Computed ──
  const completedMilestones = data?.milestones.filter(m => m.status === 'completed') || []
  const pendingMilestones = data?.milestones.filter(m => m.status === 'pending') || []
  const selectedDef = pendingMilestones.find(m => m.milestone_name === selectedMilestone)
  const pct = data?.total_completed_percentage || 0
  const gstPercent = Number(data?.gst_percent || 0)
  const grandTotalAmount = Number(data?.grand_total_amount || data?.total_property_amount || 0)
  const totalDueGeneratedWithGst = Number(data?.total_due_generated_with_gst || data?.total_due_generated || 0)
  const remainingCollectableWithGst = Number(data?.remaining_collectable_with_gst || data?.remaining_collectable || 0)
  const scheduleCombinedDue = Number(data?.schedule_combined_due || 0)
  const scheduleCarryOver = Number(data?.schedule_carry_over || 0)
  const scheduleNextInstallment = Number(data?.schedule_next_installment_amount || 0)
  const scheduleNextStageAmount = Number(data?.schedule_next_stage_amount || 0)

  // Last payment info
  const lastPayment = payments.length > 0 ? payments[0] : null

  // Overdue detection
  const daysSinceLastUpdate = data?.last_updated
    ? Math.floor((Date.now() - new Date(data.last_updated).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // ────────────────────────────────────────────────────────────────────────
  // SAVE PROGRESS — Single click automation flow
  // ────────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedMilestone || !clientId) return
    setSaving(true)
    try {
      // Step 1: Save milestone
      await api.createWorkProjection({
        client_id: cid,
        milestone_name: selectedMilestone,
        completion_date: completionDate,
        due_date: dueDate,
        notes: notes || undefined,
        proof_image: proofFile || undefined,
      })

      // Step 2: Auto-generate demand letter + send notifications
      try {
        const dlResult = await api.generateDemandLetter({
          client_id: cid,
          paid_amount: 0,
          send_email: autoSendEmail && !!data?.client.email,
          send_whatsapp: autoSendWhatsApp && !!data?.client.phone,
        })

        let statusMsg = `✅ ${selectedMilestone} completed!`
        if (dlResult.email_sent) statusMsg += ' • Email sent'
        if (dlResult.whatsapp_url) {
          window.open(dlResult.whatsapp_url, '_blank')
          statusMsg += ' • WhatsApp opened'
        }
        statusMsg += ' • Demand letter generated'
        toast.push({ tone: 'success', title: statusMsg })
      } catch {
        toast.push({ tone: 'success', title: `✅ ${selectedMilestone} completed! (Demand letter auto-generation skipped)` })
      }

      // Reset form
      setSelectedMilestone('')
      setNotes('')
      setProofFile(null)
      setCompletionDate(new Date().toISOString().split('T')[0])
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      setDueDate(nextWeek.toISOString().split('T')[0])
      if (fileInputRef.current) fileInputRef.current.value = ''

      await loadAll()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  // ── Edit / Delete handlers ──
  const handleEdit = async () => {
    if (!editingId) return
    setEditSaving(true)
    try {
      await api.updateWorkProjection(editingId, {
        completion_date: editDate || undefined,
        notes: editNotes,
        proof_image: editFile || undefined,
      })
      toast.push({ tone: 'success', title: 'Milestone updated' })
      setEditingId(null)
      await loadAll()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    } finally { setEditSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await api.deleteWorkProjection(deleteConfirm)
      toast.push({ tone: 'success', title: 'Milestone removed' })
      setDeleteConfirm(null)
      await loadAll()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    } finally { setDeleting(false) }
  }

  const openEdit = (m: WorkProjection) => {
    setEditingId(m.id)
    setEditDate(m.completion_date ? m.completion_date.split('T')[0] : '')
    setEditNotes(m.notes || '')
    setEditFile(null)
  }

  // ── Send reminder ──
  const handleSendReminder = async (channel: 'email' | 'whatsapp' | 'email_dl') => {
    if (channel === 'whatsapp') {
      setSendingWhatsApp(true)
      try {
        const res = await api.generateDemandLetter({
          client_id: cid, paid_amount: 0,
          send_email: false, send_whatsapp: true,
        })
        if (res.whatsapp_url) window.open(res.whatsapp_url, '_blank')
        toast.push({ tone: 'success', title: 'WhatsApp opened — send manually' })
        await loadAll()
      } catch (e) {
        toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
      } finally { setSendingWhatsApp(false) }
    } else if (channel === 'email_dl') {
      setSendingReminder(true)
      try {
        await api.sendEnhancedReminder(cid, true)
        toast.push({ tone: 'success', title: 'Reminder with demand letter sent via email!' })
        await loadAll()
      } catch (e) {
        toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
      } finally { setSendingReminder(false) }
    } else {
      setSendingReminder(true)
      try {
        await api.sendEnhancedReminder(cid, false)
        toast.push({ tone: 'success', title: 'Email reminder sent!' })
        await loadAll()
      } catch (e) {
        toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
      } finally { setSendingReminder(false) }
    }
  }

  // ── Generate demand letter standalone ──
  const handleGenerateDL = async () => {
    setGeneratingDL(true)
    try {
      const res = await api.generateDemandLetter({
        client_id: cid, paid_amount: 0,
        send_email: false, send_whatsapp: false,
      })
      toast.push({ tone: 'success', title: 'Demand letter generated!' })
      if (res.file_url) {
        window.open(res.file_url, '_blank')
      }
      await loadAll()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    } finally { setGeneratingDL(false) }
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
      </div>
    )
  }
  if (!data) return <EmptyState title="Client not found" />

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/portal/work-projection')} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Work Projection</h1>
          <p className="text-sm text-slate-500">All-in-one construction tracking for <strong>{data.client.name}</strong></p>
        </div>
      </div>

      {/* ═══ OVERDUE WARNING ═══ */}
      {data.remaining_collectable > 0 && daysSinceLastUpdate !== null && daysSinceLastUpdate > 30 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-500" />
          <div>
            <div className="text-base font-bold text-red-800">Overdue Warning</div>
            <div className="text-sm text-red-600">
              No milestone update in <strong>{daysSinceLastUpdate} days</strong>. Pending collectable: <strong>{inr(data.remaining_collectable)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 1. CLIENT SUMMARY ═══ */}
      <PortalCard>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{data.client.name}</div>
            <div className="text-sm font-medium text-slate-500">
              {data.client.unique_client_id}
              {data.client.apartment_name && ` • ${data.client.apartment_name}`}
              {data.client.flat_number && ` • Flat ${data.client.flat_number}`}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Property Name" value={data.client.property_name || data.client.apartment_name || '—'} />
          <InfoItem label="Flat Number" value={data.client.flat_number || '—'} />
          <InfoItem label="Flat Value" value={inr(data.total_property_amount)} bold />
          <InfoItem label={`Grand Total${gstPercent > 0 ? ` incl. ${gstPercent}% GST` : ''}`} value={inr(grandTotalAmount)} bold />
          <InfoItem label="Total Paid (incl. GST)" value={inr(Number(data.total_paid_with_gst || data.total_paid))} color="emerald" bold />
          <InfoItem label="Total Due incl. GST" value={inr(remainingCollectableWithGst)} color="red" bold />
          <InfoItem label="Construction Progress" value={`${pct}%`} color="orange" bold />
          <InfoItem
            label="Current Milestone"
            value={completedMilestones.length > 0 ? completedMilestones[completedMilestones.length - 1].milestone_name : 'Not Started'}
          />
          <InfoItem
            label="Next Due"
            value={pendingMilestones.length > 0 ? `${pendingMilestones[0].milestone_name} (${pendingMilestones[0].milestone_percentage}%)` : 'All Completed'}
          />
          {lastPayment && (
            <InfoItem
              label="Last Payment (incl. GST)"
              value={`${inr(Number(lastPayment.amount || 0) + Number(lastPayment.gst_amount || 0))} on ${new Date(lastPayment.payment_date).toLocaleDateString('en-IN')}`}
              color="emerald"
            />
          )}
          <InfoItem
            label="Last Updated"
            value={data.last_updated ? new Date(data.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No updates'}
          />
        </div>
      </PortalCard>

      {/* ═══ 2. CONSTRUCTION PROGRESS ═══ */}
      <PortalCard>
        <div className="text-center">
          <div className={`text-5xl font-extrabold tracking-tight ${pct >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>
            {pct}%
          </div>
          <div className="mt-1 text-lg font-bold text-slate-600">Construction Completed</div>
          {pct < 100 && (
            <div className="mt-1 text-sm text-slate-400">
              Remaining: {data.total_pending_percentage}% • Next: {pendingMilestones[0]?.milestone_name || '—'}
            </div>
          )}
        </div>
        <div className="mt-5 h-5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400 font-semibold">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>

        {/* Financial Summary Row */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MiniCard label="Flat Value" value={inr(data.total_property_amount)} />
          <MiniCard label="Grand Total incl. GST" value={inr(grandTotalAmount)} />
          <MiniCard label="Due Generated" value={inr(totalDueGeneratedWithGst)} color="orange" />
          <MiniCard label="Amount Paid (incl. GST)" value={inr(Number(data.total_paid_with_gst || data.total_paid))} color="emerald" />
          <MiniCard label="Collectable incl. GST" value={inr(remainingCollectableWithGst)} color="red" />
          <MiniCard label="Advance Payment" value={inr(data.advance_payment || 0)} color={data.advance_payment && data.advance_payment > 0 ? 'emerald' : 'slate'} />
        </div>
      </PortalCard>

      {/* ═══ 3. UPDATE WORK PROJECTION ═══ */}
      {pct < 100 && (
        <PortalCard>
          <div className="flex items-center gap-2 mb-5">
            <Upload className="h-5 w-5 text-orange-500" />
            <span className="text-xl font-extrabold text-slate-900">Update Work Progress</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Milestone Dropdown */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Select Milestone <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
              >
                <option value="">Choose a milestone...</option>
                {pendingMilestones.map((m) => (
                  <option key={m.milestone_name} value={m.milestone_name}>
                    {m.milestone_name} ({m.milestone_percentage}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled Percentage */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Percentage</label>
              <input
                type="text"
                disabled
                value={selectedDef ? `${selectedDef.milestone_percentage}%` : '—'}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-600 shadow-sm"
              />
            </div>

            {/* Completion Date */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Completion Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Payment Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
              />
            </div>

            {/* Upload Site Image */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Upload Site Image</label>
              <div className="mt-2">
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="hidden" id="proof-upload" />
                <label htmlFor="proof-upload" className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-500 transition hover:border-orange-300 hover:bg-orange-50/50">
                  <ImagePlus className="h-5 w-5" />
                  {proofFile ? proofFile.name : 'Click to upload (optional)'}
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <Textarea label="Notes (Optional)" value={notes} onChange={setNotes} rows={2} placeholder="Any remarks about this milestone..." />
          </div>

          {/* Auto-send options */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-sm font-bold text-slate-600 mb-3">When you save, system will automatically:</div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={autoSendEmail} onChange={(e) => setAutoSendEmail(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-700">Send Demand Letter via Email</span>
                {!data.client.email && <span className="text-xs text-red-500 ml-auto">No email</span>}
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={autoSendWhatsApp} onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
                <MessageCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-slate-700">Send Reminder via WhatsApp</span>
                {!data.client.phone && <span className="text-xs text-red-500 ml-auto">No phone</span>}
              </label>
            </div>
          </div>

          {/* Due Preview */}
          {selectedDef && (
            <div className="mt-4 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4">
              <div className="text-sm font-bold text-slate-600 mb-2">After completing this milestone:</div>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <span className="text-slate-400">New Progress:</span>
                  <span className="ml-2 font-extrabold text-orange-700">{pct + selectedDef.milestone_percentage}%</span>
                </div>
                <div>
                  <span className="text-slate-400">New Total Due:</span>
                  <span className="ml-2 font-extrabold text-orange-700">
                    {inr(((data.total_property_amount * (pct + selectedDef.milestone_percentage)) / 100) * (1 + gstPercent / 100))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">This Milestone Due:</span>
                  <span className="ml-2 font-extrabold text-slate-800">
                    {inr(((data.total_property_amount * selectedDef.milestone_percentage) / 100) * (1 + gstPercent / 100))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-5 flex justify-end">
            <PortalButton onClick={handleSave} disabled={saving || !selectedMilestone} className="px-8 py-3 text-base">
              <Save className="h-5 w-5" />
              {saving ? 'Processing...' : 'Save Progress'}
            </PortalButton>
          </div>
        </PortalCard>
      )}

      {/* ═══ 4. GENERATED DUE DETAILS ═══ */}
      <CollapsibleSection title="Generated Due Details" icon={<FileText className="h-5 w-5 text-orange-500" />} open={dueOpen} onToggle={() => setDueOpen(o => !o)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-4">
          <MiniCard label="Base Due Generated" value={inr(data.total_due_generated)} color="orange" />
          <MiniCard label="GST on Due" value={inr(data.total_due_generated_gst || 0)} color="orange" />
          <MiniCard label="Total Due (incl. GST)" value={inr(totalDueGeneratedWithGst)} color="orange" />
          <MiniCard label="Total Paid (incl. GST)" value={inr(Number(data.total_paid_with_gst || data.total_paid))} color="emerald" />
          <MiniCard label="Due Status" value={data.remaining_collectable > 0 ? 'Payment Pending' : 'All Clear'} color={data.remaining_collectable > 0 ? 'red' : 'emerald'} />
          <MiniCard label="Advance Payment" value={inr(data.advance_payment || 0)} color={data.advance_payment && data.advance_payment > 0 ? 'emerald' : 'slate'} />
        </div>

        {scheduleCombinedDue > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Previous due: <strong>{inr(scheduleCarryOver)}</strong>
            {scheduleNextStageAmount > 0 && (
              <> + Current installment: <strong>{inr(scheduleNextStageAmount)}</strong></>
            )}
            {scheduleNextInstallment > 0 && (
              <> = <strong>{inr(scheduleNextInstallment)}</strong></>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <PortalButton variant="primary" onClick={handleGenerateDL} disabled={generatingDL}>
            <FileText className="h-4 w-4" />
            {generatingDL ? 'Generating...' : 'Generate Demand Letter'}
          </PortalButton>
          <PortalButton variant="outline" onClick={() => handleSendReminder('email')} disabled={sendingReminder || !data.client.email}>
            <Mail className="h-4 w-4 text-blue-500" />
            {sendingReminder ? 'Sending...' : 'Send Email Reminder'}
          </PortalButton>
          <PortalButton variant="outline" onClick={() => handleSendReminder('whatsapp')} disabled={sendingWhatsApp || !data.client.phone}>
            <MessageCircle className="h-4 w-4 text-green-600" />
            {sendingWhatsApp ? 'Opening...' : 'Send WhatsApp'}
          </PortalButton>
          <PortalButton variant="outline" onClick={() => handleSendReminder('email_dl')} disabled={sendingReminder || !data.client.email}>
            <Send className="h-4 w-4 text-orange-500" />
            Email + Demand Letter
          </PortalButton>
        </div>
      </CollapsibleSection>

      {/* ═══ 5. DEMAND LETTERS ═══ */}
      <CollapsibleSection title={`Demand Letters (${demandLetters.length})`} icon={<FileText className="h-5 w-5 text-blue-500" />} open={demandOpen} onToggle={() => setDemandOpen(o => !o)}>
        {demandLetters.length === 0 ? (
          <div className="text-sm text-slate-400 py-4">No demand letters generated yet</div>
        ) : (
          <div className="space-y-3">
            {demandLetters.map((dl) => (
              <div key={dl.id} className="rounded-xl border border-slate-100 bg-gradient-to-r from-blue-50/50 to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-800">
                      Demand Letter #{dl.id}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Due: <strong className="text-orange-700">{inr(dl.due_amount)}</strong>
                      {dl.gst_amount > 0 && <> • GST: {inr(dl.gst_amount)}</>}
                      {dl.grand_total > 0 && <> • Grand Total: <strong>{inr(dl.grand_total)}</strong></>}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Generated: {dl.generated_date ? new Date(dl.generated_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {dl.email_sent && <span className="ml-2 text-emerald-600 font-semibold">✉️ Emailed</span>}
                      {dl.whatsapp_sent && <span className="ml-2 text-green-600 font-semibold">📱 WhatsApp</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {dl.file_url && (
                      <>
                        <a href={dl.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600" title="Preview PDF">
                          <Eye className="h-4 w-4" />
                        </a>
                        <a href={dl.file_url} download
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600" title="Download PDF">
                          <Download className="h-4 w-4" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ═══ 6. PAYMENT REMINDERS ═══ */}
      <CollapsibleSection title={`Payment Reminders (${reminders.length})`} icon={<Bell className="h-5 w-5 text-amber-500" />} open={reminderOpen} onToggle={() => setReminderOpen(o => !o)}>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <PortalButton variant="outline" onClick={() => handleSendReminder('email')} disabled={sendingReminder || !data.client.email} className="text-sm">
            <Mail className="h-4 w-4 text-blue-500" /> Email Reminder
          </PortalButton>
          <PortalButton variant="outline" onClick={() => handleSendReminder('whatsapp')} disabled={sendingWhatsApp || !data.client.phone} className="text-sm">
            <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp Reminder
          </PortalButton>
          <PortalButton variant="outline" onClick={() => handleSendReminder('email_dl')} disabled={sendingReminder || !data.client.email} className="text-sm">
            <Send className="h-4 w-4 text-orange-500" /> Email + Demand Letter
          </PortalButton>
        </div>

        {reminders.length === 0 ? (
          <div className="text-sm text-slate-400 py-2">No reminders sent yet</div>
        ) : (
          <div className="space-y-2">
            {reminders.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${r.email_status === 'sent' ? 'bg-emerald-100 text-emerald-600' : r.email_status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-700">
                    {r.stage_name || 'Due Reminder'}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.email_status === 'sent' ? 'bg-emerald-100 text-emerald-700' : r.email_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.email_status}
                    </span>
                    {r.whatsapp_initiated && <span className="ml-1 text-[10px] font-bold text-green-600">+ WhatsApp</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {r.sent_on ? new Date(r.sent_on).toLocaleString('en-IN') : '—'}
                    • Due: {inr(r.combined_due)}
                    • {r.trigger_type === 'cron' ? 'Auto' : 'Manual'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ═══ 7. COMBINED CONSTRUCTION TIMELINE ═══ */}
      <CollapsibleSection title="Construction Timeline" icon={<Clock className="h-5 w-5 text-orange-500" />} open={timelineOpen} onToggle={() => setTimelineOpen(o => !o)}>
        <div className="space-y-3">
          {/* Completed milestones with linked events */}
          {completedMilestones.map((m) => {
            const dateStr = m.completion_date ? new Date(m.completion_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
            const dueGenerated = (data.total_property_amount * m.milestone_percentage) / 100

            // Find related demand letters and communications
            const relatedDLs = demandLetters.filter(dl => {
              if (!dl.generated_date || !m.completion_date) return false
              const dlDate = new Date(dl.generated_date).toDateString()
              const mDate = new Date(m.completion_date).toDateString()
              return dlDate === mDate
            })

            const relatedComms = communications.filter(c => {
              if (!c.sent_on || !m.completion_date) return false
              const cDate = new Date(c.sent_on).toDateString()
              const mDate = new Date(m.completion_date).toDateString()
              return cDate === mDate
            })

            return (
              <div key={m.id || m.milestone_name} className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Date header */}
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{dateStr}</div>

                    {/* Milestone info */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold text-emerald-800">{m.milestone_name}</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        {m.milestone_percentage}% Work Projection
                      </span>
                    </div>

                    {/* Due Generated */}
                    <div className="mt-1 text-sm font-bold text-slate-700">
                      {inr(dueGenerated)} Due Generated
                    </div>

                    {/* Notes */}
                    {m.notes && <div className="mt-1 text-sm text-slate-500 italic">"{m.notes}"</div>}

                    {/* Related events */}
                    {relatedDLs.length > 0 && (
                      <div className="mt-1 text-xs text-blue-600 font-semibold">
                        📄 Demand Letter Created
                      </div>
                    )}
                    {relatedComms.filter(c => c.channel === 'whatsapp').length > 0 && (
                      <div className="mt-0.5 text-xs text-green-600 font-semibold">
                        📱 WhatsApp Reminder Sent
                      </div>
                    )}
                    {relatedComms.filter(c => c.channel === 'email').length > 0 && (
                      <div className="mt-0.5 text-xs text-blue-600 font-semibold">
                        ✉️ Email Reminder Sent
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {m.proof_image && (
                      <button onClick={() => setPreviewImage(m.proof_image!)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600" title="View Proof">
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(m)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(m.id!)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600" title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pending milestones */}
          {pendingMilestones.map((m) => (
            <div key={m.milestone_name} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-slate-300">
                <Circle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-base font-bold text-slate-400">{m.milestone_name}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400">
                  {m.milestone_percentage}%
                </span>
                <div className="mt-0.5 text-sm text-slate-300">Pending</div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ═══ MODALS ═══ */}

      {/* Edit Modal */}
      <Modal open={editingId !== null} onClose={() => !editSaving && setEditingId(null)} title="Edit Milestone" wide>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Completion Date</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4" />
          </div>
          <Textarea label="Notes" value={editNotes} onChange={setEditNotes} rows={2} />
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Upload New Proof Image</label>
            <div className="mt-2">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setEditFile(e.target.files?.[0] || null)} className="hidden" id="edit-proof" />
              <label htmlFor="edit-proof" className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-500 transition hover:border-orange-300 hover:bg-orange-50/50">
                <ImagePlus className="h-5 w-5" />
                {editFile ? editFile.name : 'Click to upload (optional)'}
              </label>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setEditingId(null)} disabled={editSaving}>Cancel</PortalButton>
          <PortalButton onClick={handleEdit} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</PortalButton>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteConfirm !== null} onClose={() => !deleting && setDeleteConfirm(null)} title="Remove Milestone">
        <p className="text-base text-slate-600">
          Are you sure? This will reduce the total work projection and recalculate dues.
        </p>
        <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <strong>Warning:</strong> This action cannot be undone.
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</PortalButton>
          <PortalButton variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Removing...' : 'Yes, Remove'}
          </PortalButton>
        </div>
      </Modal>

      {/* Image Preview */}
      <Modal open={previewImage !== null} onClose={() => setPreviewImage(null)} title="Site Proof Image" wide>
        {previewImage && (
          <div className="flex items-center justify-center">
            <img src={previewImage} alt="Site proof" className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-lg" />
          </div>
        )}
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════════════

function InfoItem({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  const colorClass =
    color === 'emerald' ? 'text-emerald-600' :
    color === 'red' ? 'text-red-600' :
    color === 'orange' ? 'text-orange-600' :
    'text-slate-900'

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-lg ${bold ? 'font-extrabold' : 'font-bold'} ${colorClass}`}>{value}</div>
    </div>
  )
}

function MiniCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const bg =
    color === 'emerald' ? 'border-emerald-100 bg-emerald-50/60' :
    color === 'red' ? 'border-red-100 bg-red-50/60' :
    color === 'orange' ? 'border-orange-100 bg-orange-50/60' :
    'border-slate-100 bg-slate-50/60'
  const textColor =
    color === 'emerald' ? 'text-emerald-700' :
    color === 'red' ? 'text-red-700' :
    color === 'orange' ? 'text-orange-700' :
    'text-slate-800'

  return (
    <div className={`rounded-xl border p-3 ${bg}`}>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-extrabold ${textColor}`}>{value}</div>
    </div>
  )
}

function CollapsibleSection({ title, icon, open, onToggle, children }: {
  title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <PortalCard>
      <button onClick={onToggle} className="flex w-full items-center gap-2 text-left">
        {icon}
        <span className="flex-1 text-xl font-extrabold text-slate-900">{title}</span>
        {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </PortalCard>
  )
}
