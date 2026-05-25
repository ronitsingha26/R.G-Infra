/**
 * R.G INFRA CRM — Client Detail Page
 * Shows Phase 1 fields: Client Info, Property Details, Infrastructure, Payments, Communication
 */

import { ArrowLeft, Building2, HardHat, MapPin, Pencil, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Client } from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, Textarea } from '../ui'
import { CommunicationHistoryPanel, GenerateDemandLetterButton, SendWhatsAppButton, SendDueReminderButton } from './CommunicationActions'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = usePortalToast()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', purchase_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const d = await api.getClient(Number(id))
      setClient(d as any)
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

  const openEdit = () => {
    setForm({
      name: client.name || client.company_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      purchase_date: client.purchase_date ? client.purchase_date.split('T')[0] : '',
    })
    setEditOpen(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteClient(client!.id)
      toast.push({ tone: 'success', title: 'Client deleted' })
      navigate('/portal/clients')
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to delete' })
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
        address: form.address,
        purchase_date: form.purchase_date || undefined,
        flat_id: client.flat_id,
      } as any)
      toast.push({ tone: 'success', title: 'Client updated' })
      setEditOpen(false)
      load()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setSaving(false)
    }
  }


  // Compute paid/due from total_amount
  const totalAmount = Number(client.total_amount || 0)
  const totalPaid = Number(client.total_paid || 0)
  const totalDue = Math.max(0, totalAmount - totalPaid)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/portal/clients')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-extrabold text-slate-900">{displayName}</div>
            <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700">
              {client.unique_client_id || '—'}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {client.apartment_name && `${client.apartment_name} • `}
            {client.flat_number && `Flat ${client.flat_number}`}
            {!client.apartment_name && !client.flat_number && 'No property assigned'}
          </div>
        </div>
        <PortalButton variant="outline" onClick={() => navigate(`/portal/work-projection/${client.id}`)}><HardHat className="h-4 w-4" /> Work Projection</PortalButton>
        <PortalButton variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" /> Edit</PortalButton>
        <PortalButton variant="danger" onClick={() => setDeleteConfirm(true)}><Trash2 className="h-4 w-4" /></PortalButton>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Amount</div><div className="mt-1 text-xl font-extrabold text-slate-900">{inr(totalAmount)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Paid</div><div className="mt-1 text-xl font-extrabold text-emerald-600">{inr(totalPaid)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Due</div><div className="mt-1 text-xl font-extrabold text-red-600">{inr(totalDue)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">SBU Area</div><div className="mt-1 text-xl font-extrabold text-slate-900">{client.sbu_area ? `${client.sbu_area} sqft` : '—'}</div></PortalCard>
      </div>

      {/* Communication Actions */}
      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Communication Actions</div>
        <div className="flex flex-wrap gap-3">
          <GenerateDemandLetterButton clientId={client.id} clientEmail={client.email} clientPhone={client.phone} onGenerated={load} />
          <SendWhatsAppButton clientId={client.id} clientPhone={client.phone} dueAmount={totalDue} type="due" />
          {client.email && totalDue > 0 && (
            <SendDueReminderButton
              clientId={client.id}
              clientEmail={client.email}
              totalAmount={totalAmount}
              totalPaid={totalPaid}
              onSent={load}
            />
          )}
        </div>
      </PortalCard>

      {/* Client Information */}
      <PortalCard>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-extrabold text-slate-900">Client Information</span>
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

      {/* Property Details */}
      <PortalCard>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-extrabold text-slate-900">Property Details</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-400 font-semibold">Apartment:</span> <span className="text-slate-700">{client.apartment_name || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Flat Number:</span> <span className="text-slate-700">{client.flat_number || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Floor:</span> <span className="text-slate-700">{client.floor || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Block:</span> <span className="text-slate-700">{client.block || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">SBU Area:</span> <span className="text-slate-700">{client.sbu_area ? `${client.sbu_area} sqft` : '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Total Amount:</span> <span className="text-slate-700 font-bold">{inr(totalAmount)}</span></div>
        </div>
      </PortalCard>

      {/* Infrastructure Details */}
      <PortalCard>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-extrabold text-slate-900">Infrastructure Details</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-400 font-semibold">Parking Allotment:</span> <span className={`font-bold ${client.parking_allotment ? 'text-emerald-600' : 'text-slate-400'}`}>{client.parking_allotment ? `Yes (Slot: ${client.parking_slot_no || '—'})` : 'No'}</span></div>
          <div><span className="text-slate-400 font-semibold">Extra Parking:</span> <span className={`font-bold ${client.extra_parking_allotment ? 'text-emerald-600' : 'text-slate-400'}`}>{client.extra_parking_allotment ? `Yes (Slot: ${client.extra_parking_slot_no || '—'}, Charge: ${client.extra_parking_charge ? inr(client.extra_parking_charge) : '—'})` : 'No'}</span></div>
          <div><span className="text-slate-400 font-semibold">Transformer (Apartment):</span> <span className="text-slate-700">{client.transformer_apartment || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Transformer (Flat):</span> <span className="text-slate-700">{client.transformer_flat || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Corpus Fund:</span> <span className="text-slate-700">{client.corpus_fund ? inr(client.corpus_fund) : '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Electricity Board:</span> <span className="text-slate-700">{client.electricity_board_source || '—'}</span></div>
        </div>
      </PortalCard>

      {/* Communication History */}
      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Communication History</div>
        <CommunicationHistoryPanel clientId={client.id} />
      </PortalCard>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} />
          <Input label="Email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} type="email" />
          <Input label="Purchase Date" value={form.purchase_date} onChange={(v) => setForm((s) => ({ ...s, purchase_date: v }))} type="date" />
        </div>
        <div className="mt-4">
          <Textarea label="Address" value={form.address} onChange={(v) => setForm((s) => ({ ...s, address: v }))} rows={2} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setEditOpen(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PortalButton>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirm} onClose={() => !deleting && setDeleteConfirm(false)} title="Delete Client">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{displayName}</strong>? 
            This will remove all their details and make their assigned flat available again.
          </p>
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <strong>Warning:</strong> This action cannot be undone. Associated data (payments, demand letters) might also be affected or orphaned.
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
            Cancel
          </PortalButton>
          <PortalButton variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Yes, Delete Client'}
          </PortalButton>
        </div>
      </Modal>
    </div>
  )
}
