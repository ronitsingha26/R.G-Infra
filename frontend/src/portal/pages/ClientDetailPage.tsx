import { ArrowLeft, Mail, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type ClientDetail as CD } from '../api'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, StatusBadge, Textarea } from '../ui'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = usePortalToast()
  const [client, setClient] = useState<CD | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_person: '', phone: '', email: '', address: '', city: '', state: '', gstin: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try { setLoading(true); const d = await api.getClient(Number(id)); setClient(d) }
    catch { toast.push({ tone: 'error', title: 'Failed to load client' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
  if (!client) return <EmptyState title="Client not found" />

  const openEdit = () => {
    setForm({ company_name: client.company_name || '', contact_person: client.contact_person || '', phone: client.phone || '', email: client.email || '', address: client.address || '', city: client.city || '', state: client.state || '', gstin: client.gstin || '', notes: client.notes || '' })
    setEditOpen(true)
  }
  const handleSave = async () => {
    setSaving(true)
    try { await api.updateClient(client.id, form); toast.push({ tone: 'success', title: 'Client updated' }); setEditOpen(false); load() }
    catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }
  const sendDueReminder = async () => {
    try { await api.sendDueReminder(client.id); toast.push({ tone: 'success', title: 'Due reminder sent!' }) }
    catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to send' }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/portal/clients')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="text-2xl font-extrabold text-slate-900">{client.company_name}</div>
          <div className="text-sm text-slate-500">{client.contact_person} • {client.city}</div>
        </div>
        <PortalButton variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" /> Edit</PortalButton>
        {client.email && (client.total_due ?? 0) > 0 && (
          <PortalButton variant="danger" onClick={sendDueReminder}><Mail className="h-4 w-4" /> Send Due Reminder</PortalButton>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Amount</div><div className="mt-1 text-xl font-extrabold text-slate-900">{inr(client.total_project_amount)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Paid</div><div className="mt-1 text-xl font-extrabold text-emerald-600">{inr(client.total_paid)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Due</div><div className="mt-1 text-xl font-extrabold text-red-600">{inr(client.total_due)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Projects</div><div className="mt-1 text-xl font-extrabold text-slate-900">{client.projects?.length || 0}</div></PortalCard>
      </div>

      {/* Client Info */}
      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Client Information</div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-400 font-semibold">Phone:</span> <span className="text-slate-700">{client.phone || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Email:</span> <span className="text-slate-700">{client.email || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">Address:</span> <span className="text-slate-700">{client.address || '—'}</span></div>
          <div><span className="text-slate-400 font-semibold">GSTIN:</span> <span className="text-slate-700">{client.gstin || '—'}</span></div>
          {client.notes && <div className="sm:col-span-2"><span className="text-slate-400 font-semibold">Notes:</span> <span className="text-slate-700">{client.notes}</span></div>}
        </div>
      </PortalCard>

      {/* Projects */}
      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Projects ({client.projects?.length || 0})</div>
        {!client.projects?.length ? <div className="text-sm text-slate-400 py-4">No projects yet</div> : (
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Due</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{client.projects.map(p => (
                <tr key={p.id} onClick={() => navigate(`/portal/projects/${p.id}`)} className="cursor-pointer hover:bg-orange-50/50 text-slate-700">
                  <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-400" style={{ width: `${p.progress}%` }} /></div><span className="text-xs font-bold">{p.progress}%</span></div></td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(p.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{inr(p.total_paid)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{inr(p.due_amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </PortalCard>

      {/* Payment History */}
      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-4">Payment History ({client.payments?.length || 0})</div>
        {!client.payments?.length ? <div className="text-sm text-slate-400 py-4">No payments yet</div> : (
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{client.payments.map(p => (
                <tr key={p.id} className="text-slate-700">
                  <td className="px-4 py-3">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3">{p.project_name || '—'}</td>
                  <td className="px-4 py-3">{p.payment_mode || '—'}</td>
                  <td className="px-4 py-3">{p.reference_no || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{inr(p.amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </PortalCard>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company Name" value={form.company_name} onChange={v => setForm(s => ({ ...s, company_name: v }))} required />
          <Input label="Contact Person" value={form.contact_person} onChange={v => setForm(s => ({ ...s, contact_person: v }))} />
          <Input label="Phone" value={form.phone} onChange={v => setForm(s => ({ ...s, phone: v }))} />
          <Input label="Email" value={form.email} onChange={v => setForm(s => ({ ...s, email: v }))} type="email" />
          <Input label="City" value={form.city} onChange={v => setForm(s => ({ ...s, city: v }))} />
          <Input label="State" value={form.state} onChange={v => setForm(s => ({ ...s, state: v }))} />
          <Input label="GSTIN" value={form.gstin} onChange={v => setForm(s => ({ ...s, gstin: v }))} />
          <Input label="Address" value={form.address} onChange={v => setForm(s => ({ ...s, address: v }))} />
        </div>
        <div className="mt-4"><Textarea label="Notes" value={form.notes} onChange={v => setForm(s => ({ ...s, notes: v }))} /></div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setEditOpen(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PortalButton>
        </div>
      </Modal>
    </div>
  )
}
