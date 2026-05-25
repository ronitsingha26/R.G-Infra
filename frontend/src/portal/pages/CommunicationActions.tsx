/**
 * RG INFRA — Communication Action Buttons
 * Send via Email, Send via WhatsApp, Generate Demand Letter
 */

import { useState } from 'react'
import { Mail, MessageCircle, FileText, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import { usePortalToast } from '../toast'
import { PortalButton, Modal, Input } from '../ui'

// ─── Send via WhatsApp Button ──────────────────────────────────────────────
export function SendWhatsAppButton({
  clientId,
  clientPhone,
  dueAmount,
  type = 'due',
  className = '',
}: {
  clientId: number
  clientPhone?: string
  dueAmount?: number
  type?: 'due' | 'payment_done'
  className?: string
}) {
  const toast = usePortalToast()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!clientPhone) {
      toast.push({ tone: 'error', title: 'Phone number missing — cannot send WhatsApp' })
      return
    }

    setLoading(true)
    try {
      if (type === 'payment_done') {
        const res = await api.whatsappPaymentDone({ client_id: clientId, amount_paid: dueAmount || 0 })
        window.open(res.whatsapp_url, '_blank')
        toast.push({ tone: 'success', title: 'WhatsApp opened — send manually' })
      } else {
        // For due reminder — generate demand letter with whatsapp flag
        const res = await api.generateDemandLetter({
          client_id: clientId,
          paid_amount: 0,
          send_email: false,
          send_whatsapp: true,
        })
        if (res.whatsapp_url) {
          window.open(res.whatsapp_url, '_blank')
          toast.push({ tone: 'success', title: 'WhatsApp opened — send manually' })
        }
      }
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PortalButton variant="outline" onClick={handleClick} disabled={loading} className={className}>
      <MessageCircle className="h-4 w-4 text-green-600" />
      {loading ? 'Opening...' : 'Send via WhatsApp'}
    </PortalButton>
  )
}

// ─── Generate Demand Letter Modal ──────────────────────────────────────────
export function GenerateDemandLetterButton({
  clientId,
  clientEmail,
  clientPhone,
  onGenerated,
  className = '',
}: {
  clientId: number
  clientEmail?: string
  clientPhone?: string
  onGenerated?: () => void
  className?: string
}) {
  const toast = usePortalToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paidAmount, setPaidAmount] = useState('0')
  const [sendEmail, setSendEmail] = useState(false)
  const [sendWhatsApp, setSendWhatsApp] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Validate whatsapp
      if (sendWhatsApp && !clientPhone) {
        toast.push({ tone: 'error', title: 'Client phone missing — cannot send WhatsApp' })
        setLoading(false)
        return
      }
      // Validate email
      if (sendEmail && !clientEmail) {
        toast.push({ tone: 'error', title: 'Client email missing — cannot send email' })
        setLoading(false)
        return
      }

      const res = await api.generateDemandLetter({
        client_id: clientId,
        paid_amount: Number(paidAmount) || 0,
        send_email: sendEmail,
        send_whatsapp: sendWhatsApp,
      })

      toast.push({ tone: 'success', title: 'Demand letter generated!' })

      // If email was sent
      if (res.email_sent) {
        toast.push({ tone: 'success', title: 'Email sent with PDF attached' })
      }

      // If whatsapp URL returned — open in new tab
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank')
        toast.push({ tone: 'info', title: 'WhatsApp opened — send manually' })
      }

      setOpen(false)
      setPaidAmount('0')
      setSendEmail(false)
      setSendWhatsApp(false)
      onGenerated?.()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to generate' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PortalButton variant="primary" onClick={() => setOpen(true)} className={className}>
        <FileText className="h-4 w-4" /> Generate Demand Letter
      </PortalButton>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate Demand Letter">
        <div className="space-y-4">
          <Input
            label="Paid Amount (₹)"
            value={paidAmount}
            onChange={setPaidAmount}
            type="number"
            placeholder="Enter amount already paid"
          />

          {/* Send via Email toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700">Send Demand Letter via Email</span>
            </div>
            {!clientEmail && <span className="text-xs text-red-500 ml-auto">No email</span>}
          </label>

          {/* Send via WhatsApp toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-slate-700">Send Due Reminder via WhatsApp</span>
            </div>
            {!clientPhone && <span className="text-xs text-red-500 ml-auto">No phone</span>}
          </label>

          {/* Warning if no channels selected */}
          {!sendEmail && !sendWhatsApp && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              PDF will be generated only (no email or WhatsApp will be sent)
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setOpen(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </PortalButton>
        </div>
      </Modal>
    </>
  )
}

// ─── Send Due Reminder Email Modal ─────────────────────────────────────────
export function SendDueReminderButton({
  clientId,
  clientEmail,
  totalAmount,
  totalPaid,
  onSent,
  className = '',
}: {
  clientId: number
  clientEmail?: string
  totalAmount: number
  totalPaid: number
  onSent?: () => void
  className?: string
}) {
  const toast = usePortalToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const defaultPaidPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
  const [paidPct, setPaidPct] = useState(String(defaultPaidPct))
  const [nextPct, setNextPct] = useState('10')

  const handleSend = async () => {
    if (!clientEmail) {
      toast.push({ tone: 'error', title: 'Client has no email address' })
      return
    }

    setLoading(true)
    try {
      await api.sendDueReminder(clientId, {
        percentage_paid: Number(paidPct) || 0,
        next_percentage: Number(nextPct) || 0,
      })
      toast.push({ tone: 'success', title: 'Due reminder email sent!' })
      setOpen(false)
      onSent?.()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to send' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PortalButton variant="danger" onClick={() => setOpen(true)} className={className} disabled={!clientEmail}>
        <Mail className="h-4 w-4" /> Send Due Reminder Email
      </PortalButton>

      <Modal open={open} onClose={() => setOpen(false)} title="Send Due Reminder">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Send an email reminder requesting the next stage payment based on percentage.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Percentage Paid (%)"
              value={paidPct}
              onChange={setPaidPct}
              type="number"
              placeholder="e.g. 20"
            />
            <Input
              label="Next Percentage Due (%)"
              value={nextPct}
              onChange={setNextPct}
              type="number"
              placeholder="e.g. 10"
            />
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Total Flat Amount:</span>
              <span className="font-semibold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Computed Paid ({paidPct}%):</span>
              <span className="font-semibold text-emerald-600">₹{((Number(paidPct) || 0) / 100 * totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Computed Due ({nextPct}%):</span>
              <span className="font-semibold text-red-600">₹{((Number(nextPct) || 0) / 100 * totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setOpen(false)}>Cancel</PortalButton>
          <PortalButton variant="danger" onClick={handleSend} disabled={loading}>
            {loading ? 'Sending...' : 'Send Email'}
          </PortalButton>
        </div>
      </Modal>
    </>
  )
}

// ─── Communication History Panel ───────────────────────────────────────────
export function CommunicationHistoryPanel({ clientId }: { clientId: number }) {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof api.getClientCommunications>>>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      setLogs(await api.getClientCommunications(clientId))
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  // Load on mount
  useState(() => { load() })

  const statusColor = (s: string) => {
    if (s === 'sent') return 'bg-emerald-100 text-emerald-700'
    if (s === 'failed') return 'bg-red-100 text-red-700'
    if (s === 'initiated') return 'bg-blue-100 text-blue-700'
    return 'bg-slate-100 text-slate-600'
  }

  const channelIcon = (ch: string) => {
    if (ch === 'whatsapp') return <MessageCircle className="h-3.5 w-3.5 text-green-600" />
    return <Mail className="h-3.5 w-3.5 text-blue-500" />
  }

  if (loading) return <div className="text-sm text-slate-400 py-4">Loading history...</div>
  if (!logs.length) return <div className="text-sm text-slate-400 py-4">No communication history yet</div>

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <div className="mt-0.5">{channelIcon(log.channel)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 truncate">{log.subject || log.type}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(log.status)}`}>{log.status}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {log.sent_on ? new Date(log.sent_on).toLocaleString('en-IN') : '—'}
              {log.recipient_email && <span className="ml-2">→ {log.recipient_email}</span>}
              {log.recipient_phone && <span className="ml-2">→ {log.recipient_phone}</span>}
            </div>
            {(log.demand_letter_file || log.invoice_file) && (
              <a 
                href={log.demand_letter_url || log.invoice_url || log.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                📄 {log.demand_letter_file || log.invoice_file}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
