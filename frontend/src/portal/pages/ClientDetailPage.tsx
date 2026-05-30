import { ArrowLeft, Building2, CreditCard, HardHat, MapPin, Pencil, ReceiptText, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Client } from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, Textarea } from '../ui'
import { CommunicationHistoryPanel, GenerateDemandLetterButton, SendDueReminderButton, SendWhatsAppButton } from './CommunicationActions'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = usePortalToast()

  const splitPanAadhaar = (value: string) => {
    const raw = value.trim()
    if (!raw) return { pan: '', aadhaar: '' }

    const panRegex = /[A-Z]{5}\d{4}[A-Z]/i
    const aadhaarRegex = /\b\d{12}\b/

    const panMatch = raw.match(panRegex)
    const aadhaarMatch = raw.replace(/[-\s]/g, '').match(aadhaarRegex)

    let pan = panMatch ? panMatch[0].toUpperCase() : ''
    let aadhaar = aadhaarMatch ? aadhaarMatch[0] : ''

    if (!pan && !aadhaar) {
      const parts = raw.split(/[,/|]/).map((part) => part.trim()).filter(Boolean)
      for (const part of parts) {
        if (!pan && panRegex.test(part)) pan = part.toUpperCase()
        if (!aadhaar && aadhaarRegex.test(part.replace(/[-\s]/g, ''))) aadhaar = part.replace(/[-\s]/g, '')
      }
      if (!pan && parts[0]) pan = parts[0]
      if (!aadhaar && parts[1]) aadhaar = parts[1].replace(/[-\s]/g, '')
    }

    return { pan, aadhaar }
  }

  const normalizePan = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
  const normalizeAadhaar = (value: string) => value.replace(/\D/g, '').slice(0, 12)

  const [client, setClient] = useState<Client | null>(null)
  const [dueInfo, setDueInfo] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [projection, setProjection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', pan: '', aadhaar: '', address: '', purchase_date: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const clientId = Number(id)
      const [clientData, duesData, paymentRows, projectionData] = await Promise.all([
        api.getClient(clientId),
        api.getClientDues(clientId).catch(() => null),
        api.getClientPaymentHistory(clientId).catch(() => []),
        api.getWorkProjectionSummary(clientId).catch(() => null),
      ])
      setClient(clientData)
      setDueInfo(duesData)
      setPayments(paymentRows)
      setProjection(projectionData)
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load client' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
  if (!client) return <EmptyState title="Client not found" />

  const displayName = client.name || client.company_name || '—'
  const flatAmount = Number(client.total_amount || projection?.total_property_amount || 0)
  const gstPercent = Number(client.gst_percent || projection?.gst_percent || 0)
  const totalAmountWithGst = Number(client.total_amount_with_gst || projection?.grand_total_amount || (flatAmount + (flatAmount * gstPercent) / 100))
  const totalPaidBase = Number(client.total_paid || 0)
  const paymentReceivedWithGst = Number(client.total_paid_with_gst || payments.reduce((sum, row) => sum + Number(row.amount || 0) + Number(row.gst_amount || 0), 0))
  const currentDueWithGst = Number(dueInfo?.total_payable || dueInfo?.current_due || dueInfo?.current_stage_due || 0)
  const totalDueWithGst = Number(projection?.remaining_collectable_with_gst || Math.max(0, totalAmountWithGst - paymentReceivedWithGst))
  const nextInstallmentWithGst = Number(dueInfo?.next_installment_amount || projection?.schedule_next_installment_amount || 0)
  const completedMilestones = projection?.milestones?.filter((milestone: any) => milestone.status === 'completed') || []
  const pendingMilestones = projection?.milestones?.filter((milestone: any) => milestone.status !== 'completed') || []

  const openEdit = () => {
    let ids = { pan: client.pan_number || '', aadhaar: client.aadhaar_number || '' }
    if (!ids.pan && !ids.aadhaar && client.pan_aadhaar) ids = splitPanAadhaar(client.pan_aadhaar)
    setForm({
      name: client.name || client.company_name || '',
      phone: client.phone || '',
      email: client.email || '',
      pan: ids.pan,
      aadhaar: ids.aadhaar,
      address: client.address || '',
      purchase_date: client.purchase_date ? client.purchase_date.split('T')[0] : '',
    })
    setEditOpen(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteClient(client.id)
      toast.push({ tone: 'success', title: 'Client deleted' })
      navigate('/portal/clients')
    } catch (error) {
      toast.push({ tone: 'error', title: error instanceof Error ? error.message : 'Failed to delete' })
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateClient(client.id, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        pan_number: form.pan || undefined,
        aadhaar_number: form.aadhaar || undefined,
        address: form.address,
        purchase_date: form.purchase_date || undefined,
        flat_id: client.flat_id,
      } as any)
      toast.push({ tone: 'success', title: 'Client updated' })
      setEditOpen(false)
      load()
    } catch (error) {
      toast.push({ tone: 'error', title: error instanceof Error ? error.message : 'Failed' })
    } finally {
      setSaving(false)
    }
  }

  const scrollToProperty = () => {
    const element = document.getElementById('client-property')
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const summaryCards = [
    { label: 'Total Amount', value: inr(totalAmountWithGst), note: `Flat ${inr(flatAmount)} + GST ${gstPercent}%` },
    { label: 'Due Till Date', value: inr(currentDueWithGst), note: dueInfo?.current_stage || projection?.schedule_current_stage || 'Current stage due' },
    { label: 'Payment Received', value: inr(paymentReceivedWithGst), note: 'Received till date, incl. GST' },
    { label: 'Total Due', value: inr(totalDueWithGst), note: 'Remaining balance, incl. GST' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/portal/clients')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-2xl font-extrabold text-slate-900">Client Master</div>
            <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700">{client.unique_client_id || '—'}</span>
          </div>
          <div className="text-sm text-slate-500">{displayName} • {client.apartment_name || 'No apartment'}{client.flat_number ? ` • Flat ${client.flat_number}` : ''}</div>
        </div>
        <PortalButton variant="outline" onClick={scrollToProperty}><Building2 className="h-4 w-4" /> Client Property</PortalButton>
        <PortalButton variant="outline" onClick={() => navigate(`/portal/payments?client_id=${client.id}`)}><ReceiptText className="h-4 w-4" /> Add Payment</PortalButton>
        <PortalButton variant="outline" onClick={() => navigate(`/portal/work-projection/${client.id}`)}><HardHat className="h-4 w-4" /> Work Projection</PortalButton>
        <PortalButton variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" /> Edit</PortalButton>
        <PortalButton variant="danger" onClick={() => setDeleteConfirm(true)}><Trash2 className="h-4 w-4" /></PortalButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <PortalCard key={card.label}>
            <div className="text-xs font-semibold text-slate-400">{card.label}</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.note}</div>
          </PortalCard>
        ))}
      </div>

      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Communication Actions</div>
        <div className="flex flex-wrap gap-3">
          <GenerateDemandLetterButton clientId={client.id} clientEmail={client.email} clientPhone={client.phone} onGenerated={load} />
          <SendWhatsAppButton clientId={client.id} clientPhone={client.phone} dueAmount={currentDueWithGst} type="due" />
          {client.email && (
            <SendDueReminderButton clientId={client.id} clientEmail={client.email} totalAmount={flatAmount} totalPaid={totalPaidBase} onSent={load} />
          )}
        </div>
      </PortalCard>

      <PortalCard>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-extrabold text-slate-900">Client Master Information</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-400 font-semibold">Name:</span> <span className="text-slate-700">{displayName}</span></div>
          <div><span className="text-slate-400 font-semibold">Client ID:</span> <span className="text-slate-700 font-mono">{client.unique_client_id || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Phone:</span> <span className="text-slate-700">{client.phone || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Email:</span> <span className="text-slate-700">{client.email || '—'}</span></div>
          <div className="sm:col-span-2"><span className="text-slate-400 font-semibold">Address:</span> <span className="text-slate-700">{client.address || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Purchase Date:</span> <span className="text-slate-700">{client.purchase_date ? new Date(client.purchase_date).toLocaleDateString('en-IN') : '—'}</span></div>
        </div>
      </PortalCard>

      <div id="client-property">
        <PortalCard>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-orange-500" />
            <span className="text-lg font-extrabold text-slate-900">Property Details</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div><span className="text-slate-400 font-semibold">Apartment:</span> <span className="text-slate-700">{client.apartment_name || '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Flat Number:</span> <span className="text-slate-700">{client.flat_number || '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Floor:</span> <span className="text-slate-700">{client.floor || '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Block:</span> <span className="text-slate-700">{client.block || '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Flat Area:</span> <span className="text-slate-700">{client.sbu_area ? `${client.sbu_area} sqft` : '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Carpet Area:</span> <span className="text-slate-700">{client.carpet_area ? `${client.carpet_area} sqft` : '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Built Up Area:</span> <span className="text-slate-700">{client.built_up_area ? `${client.built_up_area} sqft` : '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Balcony Area:</span> <span className="text-slate-700">{client.balcony_area ? `${client.balcony_area} sqft` : '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Terrace Area:</span> <span className="text-slate-700">{client.terrace_area ? `${client.terrace_area} sqft` : '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Undivided Share:</span> <span className="text-slate-700">{client.undivided_share ?? '—'}</span></div>
            <div><span className="text-slate-400 font-semibold">Total Incl. GST:</span> <span className="text-slate-700 font-bold">{inr(totalAmountWithGst)}</span></div>
            <div><span className="text-slate-400 font-semibold">Booking Amount:</span> <span className="text-slate-700">{client.booking_amount ? inr(client.booking_amount) : '—'}</span></div>
          </div>
        </PortalCard>
      </div>

      <PortalCard>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-extrabold text-slate-900">Infrastructure Details</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-400 font-semibold">Parking Allotment:</span> <span className="text-slate-700">{client.parking_allotment ? `Yes (${client.parking_slot_no || '—'})` : 'No'}</span></div>
          <div><span className="text-slate-400 font-semibold">Extra Parking:</span> <span className="text-slate-700">{client.extra_parking_allotment ? `Yes (${client.extra_parking_slot_no || '—'})` : 'No'}</span></div>
          <div><span className="text-slate-400 font-semibold">Extra Parking Charge:</span> <span className="text-slate-700">{client.extra_parking_charge ? inr(client.extra_parking_charge) : '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Transformer (Apartment):</span> <span className="text-slate-700">{client.transformer_apartment || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Transformer (Flat):</span> <span className="text-slate-700">{client.transformer_flat || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Corpus Fund:</span> <span className="text-slate-700">{client.corpus_fund ? inr(client.corpus_fund) : '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Electricity Board:</span> <span className="text-slate-700">{client.electricity_board_source || '—'}</span></div>
        </div>
      </PortalCard>

      <PortalCard>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-orange-500" />
            <span className="text-lg font-extrabold text-slate-900">Payment Details</span>
          </div>
          <PortalButton variant="outline" onClick={() => navigate(`/portal/payments?client_id=${client.id}`)}><ReceiptText className="h-4 w-4" /> Add Payment</PortalButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div><span className="text-slate-400 font-semibold">Current Stage:</span> <span className="text-slate-700">{dueInfo?.current_stage || projection?.schedule_current_stage || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Next Stage:</span> <span className="text-slate-700">{dueInfo?.next_stage || projection?.schedule_next_stage || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Next Installment:</span> <span className="text-slate-700">{nextInstallmentWithGst ? inr(nextInstallmentWithGst) : '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Schedules:</span> <span className="text-slate-700">{dueInfo?.schedules?.length || 0}</span></div>
          <div><span className="text-slate-400 font-semibold">Total Paid (Base):</span> <span className="text-slate-700">{inr(totalPaidBase)}</span></div>
          <div><span className="text-slate-400 font-semibold">Total Paid (Incl. GST):</span> <span className="text-slate-700">{inr(paymentReceivedWithGst)}</span></div>
          <div><span className="text-slate-400 font-semibold">Total Due (Incl. GST):</span> <span className="text-slate-700 font-bold text-red-600">{inr(totalDueWithGst)}</span></div>
          <div><span className="text-slate-400 font-semibold">Due Till Date:</span> <span className="text-slate-700 font-bold text-orange-600">{inr(currentDueWithGst)}</span></div>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">GST</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={6}>No payment records found</td></tr>
              ) : payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 font-semibold">{inr(payment.amount || 0)}</td>
                  <td className="px-4 py-3 text-orange-600">{payment.gst_amount ? inr(payment.gst_amount) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">{inr(Number(payment.amount || 0) + Number(payment.gst_amount || 0))}</td>
                  <td className="px-4 py-3">{payment.payment_mode || '—'}</td>
                  <td className="px-4 py-3">{payment.reference_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalCard>

      <PortalCard>
        <div className="flex items-center gap-2 mb-4">
          <HardHat className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-extrabold text-slate-900">Work Projection Details</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div><span className="text-slate-400 font-semibold">Completed %:</span> <span className="text-slate-700 font-bold">{projection?.total_completed_percentage || 0}%</span></div>
          <div><span className="text-slate-400 font-semibold">Pending %:</span> <span className="text-slate-700 font-bold">{projection?.total_pending_percentage || 0}%</span></div>
          <div><span className="text-slate-400 font-semibold">Completed Milestones:</span> <span className="text-slate-700">{completedMilestones.length}</span></div>
          <div><span className="text-slate-400 font-semibold">Pending Milestones:</span> <span className="text-slate-700">{pendingMilestones.length}</span></div>
          <div><span className="text-slate-400 font-semibold">Project Amount:</span> <span className="text-slate-700">{inr(projection?.total_property_amount || flatAmount)}</span></div>
          <div><span className="text-slate-400 font-semibold">Projection GST:</span> <span className="text-slate-700">{projection?.gst_percent || gstPercent || 0}%</span></div>
          <div><span className="text-slate-400 font-semibold">Due Generated:</span> <span className="text-slate-700">{inr(projection?.total_due_generated_with_gst || projection?.total_due_generated || 0)}</span></div>
          <div><span className="text-slate-400 font-semibold">Remaining Collectable:</span> <span className="text-slate-700 font-bold text-red-600">{inr(projection?.remaining_collectable_with_gst || totalDueWithGst)}</span></div>
        </div>
      </PortalCard>

      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Communication History</div>
        <CommunicationHistoryPanel clientId={client.id} />
      </PortalCard>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(value) => setForm((state) => ({ ...state, name: value }))} required />
          <Input label="Phone" value={form.phone} onChange={(value) => setForm((state) => ({ ...state, phone: value }))} type="tel" inputMode="numeric" maxLength={10} />
          <Input label="Email" value={form.email} onChange={(value) => setForm((state) => ({ ...state, email: value }))} type="email" />
          <Input label="PAN" value={form.pan} onChange={(value) => setForm((state) => ({ ...state, pan: normalizePan(value) }))} placeholder="10 characters" />
          <Input label="Aadhaar" value={form.aadhaar} onChange={(value) => setForm((state) => ({ ...state, aadhaar: normalizeAadhaar(value) }))} placeholder="12 digits" />
          <Input label="Purchase Date" value={form.purchase_date} onChange={(value) => setForm((state) => ({ ...state, purchase_date: value }))} type="date" />
        </div>
        <div className="mt-4">
          <Textarea label="Address" value={form.address} onChange={(value) => setForm((state) => ({ ...state, address: value }))} rows={2} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setEditOpen(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PortalButton>
        </div>
      </Modal>

      <Modal open={deleteConfirm} onClose={() => !deleting && setDeleteConfirm(false)} title="Delete Client">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Are you sure you want to delete <strong>{displayName}</strong>? This will remove all their details and make their assigned flat available again.</p>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Warning:</strong> This action cannot be undone. Associated data such as payments and demand letters may also be affected.
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancel</PortalButton>
          <PortalButton variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Yes, Delete Client'}</PortalButton>
        </div>
      </Modal>
    </div>
  )
}