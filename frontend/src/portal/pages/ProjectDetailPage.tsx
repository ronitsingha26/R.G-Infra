import { ArrowLeft, Mail, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type ProjectDetail as PD } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, Select, StatusBadge, Textarea } from '../ui'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = usePortalToast()
  const store = usePortalStore()
  const [project, setProject] = useState<PD | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [form, setForm] = useState({ name:'', client_id:'', location:'', description:'', total_amount:'', status:'Planning', progress:'0', start_date:'', deadline:'' })
  const [payForm, setPayForm] = useState({ amount:'', payment_date:'', payment_mode:'', reference_no:'', notes:'' })
  const [saving, setSaving] = useState(false)

  const load = async () => { try { setLoading(true); setProject(await api.getProject(Number(id))) } catch { toast.push({ tone:'error', title:'Failed to load' }) } finally { setLoading(false) } }
  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>
  if (!project) return <EmptyState title="Project not found" />

  const clientOpts = store.clients.map(c => ({ value: String(c.id), label: c.company_name }))
  const statusOpts = ['Planning','Ongoing','Delayed','Completed'].map(s => ({ value: s, label: s }))
  const modeOpts = ['UPI','Bank Transfer','Cheque','Cash','Other'].map(s => ({ value: s, label: s }))

  const openEdit = () => {
    setForm({ name: project.name||'', client_id: String(project.client_id||''), location: project.location||'', description: project.description||'', total_amount: String(project.total_amount||''), status: project.status||'Planning', progress: String(project.progress||0), start_date: project.start_date?.slice(0,10)||'', deadline: project.deadline?.slice(0,10)||'' })
    setEditOpen(true)
  }
  const handleSave = async () => {
    setSaving(true)
    try { await api.updateProject(project.id, { ...form, client_id: Number(form.client_id)||undefined, total_amount: Number(form.total_amount)||0, progress: Number(form.progress)||0 } as any); toast.push({ tone:'success', title:'Project updated' }); setEditOpen(false); load(); store.refreshProjects(); store.refreshDashboard() }
    catch (e) { toast.push({ tone:'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }
  const handlePay = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return
    setSaving(true)
    try {
      const pay = await api.createPayment({ project_id: project.id, client_id: project.client_id, amount: Number(payForm.amount), payment_date: payForm.payment_date || undefined, payment_mode: payForm.payment_mode || undefined, reference_no: payForm.reference_no || undefined, notes: payForm.notes || undefined } as any)
      toast.push({ tone:'success', title:'Payment added' })
      // Ask to send email
      if (project.client_email) {
        try { await api.sendReceipt(pay.id); toast.push({ tone:'success', title:'Receipt email sent to client' }) }
        catch (e) { toast.push({ tone:'warning', title: 'Payment saved but email failed: ' + (e instanceof Error ? e.message : '') }) }
      }
      setPayOpen(false); setPayForm({ amount:'', payment_date:'', payment_mode:'', reference_no:'', notes:'' }); load(); store.refreshPayments(); store.refreshDashboard()
    } catch (e) { toast.push({ tone:'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/portal/projects')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-extrabold text-slate-900">{project.name}</div>
          <div className="text-sm text-slate-500">{project.client_name || 'No client'} • {project.location}</div>
        </div>
        <PortalButton variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" /> Edit</PortalButton>
        <PortalButton onClick={() => setPayOpen(true)}><Plus className="h-4 w-4" /> Add Payment</PortalButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PortalCard><div className="text-xs font-semibold text-slate-400">Status</div><div className="mt-1"><StatusBadge status={project.status} /></div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Progress</div><div className="mt-1 text-xl font-extrabold text-slate-900">{project.progress}%</div><div className="mt-2 h-2 w-full rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-400" style={{ width:`${project.progress}%` }} /></div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Total Amount</div><div className="mt-1 text-xl font-extrabold text-slate-900">{inr(project.total_amount)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Paid</div><div className="mt-1 text-xl font-extrabold text-emerald-600">{inr(project.total_paid)}</div></PortalCard>
        <PortalCard><div className="text-xs font-semibold text-slate-400">Due</div><div className="mt-1 text-xl font-extrabold text-red-600">{inr(project.due_amount)}</div></PortalCard>
      </div>

      {project.description && <PortalCard><div className="text-sm font-bold text-slate-700 mb-2">Description</div><div className="text-sm text-slate-600">{project.description}</div></PortalCard>}

      <PortalCard>
        <div className="text-sm font-bold text-slate-700 mb-3">Project Details</div>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-400">Client:</span> <span className="text-slate-700 font-semibold">{project.client_name || '—'}</span></div>
          <div><span className="text-slate-400">Location:</span> <span className="text-slate-700">{project.location || '—'}</span></div>
          <div><span className="text-slate-400">Start:</span> <span className="text-slate-700">{project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN') : '—'}</span></div>
          <div><span className="text-slate-400">Deadline:</span> <span className="text-slate-700">{project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN') : '—'}</span></div>
        </div>
      </PortalCard>

      {/* Payments */}
      <PortalCard>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-extrabold text-slate-900">Payments ({project.payments?.length || 0})</div>
        </div>
        {!project.payments?.length ? <div className="text-sm text-slate-400 py-4">No payments yet</div> : (
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-center">Email</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">{project.payments.map(p => (
                <tr key={p.id} className="text-slate-700">
                  <td className="px-4 py-3">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3">{p.payment_mode || '—'}</td>
                  <td className="px-4 py-3">{p.reference_no || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{inr(p.amount)}</td>
                  <td className="px-4 py-3 text-center">{p.email_sent ? <span className="text-emerald-500 text-xs font-bold">Sent ✓</span> : <span className="text-slate-400 text-xs">—</span>}</td>
                  <td className="px-4 py-3">{!p.email_sent && project.client_email && (
                    <button onClick={async () => { try { await api.sendReceipt(p.id); toast.push({ tone:'success', title:'Receipt sent' }); load() } catch { toast.push({ tone:'error', title:'Failed to send' }) } }} className="text-xs font-semibold text-orange-500 hover:text-orange-700"><Mail className="h-3.5 w-3.5 inline mr-1" />Send</button>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </PortalCard>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={v => setForm(s => ({...s, name:v}))} required />
          <Select label="Client" value={form.client_id} onChange={v => setForm(s => ({...s, client_id:v}))} options={clientOpts} />
          <Input label="Location" value={form.location} onChange={v => setForm(s => ({...s, location:v}))} />
          <Input label="Total Amount (₹)" value={form.total_amount} onChange={v => setForm(s => ({...s, total_amount:v}))} type="number" />
          <Select label="Status" value={form.status} onChange={v => setForm(s => ({...s, status:v}))} options={statusOpts} />
          <Input label="Progress (%)" value={form.progress} onChange={v => setForm(s => ({...s, progress:v}))} type="number" />
          <Input label="Start Date" value={form.start_date} onChange={v => setForm(s => ({...s, start_date:v}))} type="date" />
          <Input label="Deadline" value={form.deadline} onChange={v => setForm(s => ({...s, deadline:v}))} type="date" />
        </div>
        <div className="mt-4"><Textarea label="Description" value={form.description} onChange={v => setForm(s => ({...s, description:v}))} /></div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setEditOpen(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PortalButton>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Add Payment">
        <div className="grid gap-4">
          <Input label="Amount (₹)" value={payForm.amount} onChange={v => setPayForm(s => ({...s, amount:v}))} type="number" required />
          <Input label="Payment Date" value={payForm.payment_date} onChange={v => setPayForm(s => ({...s, payment_date:v}))} type="date" />
          <Select label="Payment Mode" value={payForm.payment_mode} onChange={v => setPayForm(s => ({...s, payment_mode:v}))} options={modeOpts} />
          <Input label="Reference No." value={payForm.reference_no} onChange={v => setPayForm(s => ({...s, reference_no:v}))} />
          <Textarea label="Notes" value={payForm.notes} onChange={v => setPayForm(s => ({...s, notes:v}))} rows={2} />
        </div>
        <p className="mt-3 text-xs text-slate-400">{project.client_email ? '✉️ A receipt email will be sent to the client automatically.' : '⚠️ Client has no email — no receipt will be sent.'}</p>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setPayOpen(false)}>Cancel</PortalButton>
          <PortalButton onClick={handlePay} disabled={saving || !payForm.amount}>{saving ? 'Processing...' : 'Add Payment & Send Email'}</PortalButton>
        </div>
      </Modal>
    </div>
  )
}
