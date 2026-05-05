import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, Select, StatusBadge, Textarea } from '../ui'

export function ProjectsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', client_id: '', location: '', description: '', total_amount: '', status: 'Planning', progress: '0', start_date: '', deadline: '' })
  const [saving, setSaving] = useState(false)

  const filtered = store.projects.filter(p => {
    const q = search.toLowerCase()
    return !q || p.name?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q)
  })

  const clientOpts = store.clients.map(c => ({ value: String(c.id), label: c.company_name }))
  const statusOpts = ['Planning','Ongoing','Delayed','Completed'].map(s => ({ value: s, label: s }))

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await api.createProject({ ...form, client_id: form.client_id ? Number(form.client_id) : undefined, total_amount: Number(form.total_amount) || 0, progress: Number(form.progress) || 0 } as any)
      toast.push({ tone: 'success', title: 'Project added' })
      setShowAdd(false)
      setForm({ name: '', client_id: '', location: '', description: '', total_amount: '', status: 'Planning', progress: '0', start_date: '', deadline: '' })
      store.refreshProjects(); store.refreshDashboard()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Projects</div>
            <div className="text-sm text-slate-500">{store.projects.length} total projects</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:ring-2 w-56" />
            </div>
            <PortalButton onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Project</PortalButton>
          </div>
        </div>
      </PortalCard>

      {filtered.length === 0 ? <EmptyState title="No projects found" sub="Add your first project" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr><th className="px-5 py-3">Project</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Paid</th><th className="px-5 py-3 text-right">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{filtered.map(p => (
              <tr key={p.id} onClick={() => navigate(`/portal/projects/${p.id}`)} className="cursor-pointer hover:bg-orange-50/50 transition text-slate-700">
                <td className="px-5 py-4"><div className="font-bold text-slate-900">{p.name}</div><div className="text-xs text-slate-400">{p.location}</div></td>
                <td className="px-5 py-4">{p.client_name || '—'}</td>
                <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-4"><div className="flex items-center gap-2"><div className="h-2 w-16 rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-400" style={{ width: `${p.progress}%` }} /></div><span className="text-xs font-bold">{p.progress}%</span></div></td>
                <td className="px-5 py-4 text-right font-semibold">{inr(p.total_amount)}</td>
                <td className="px-5 py-4 text-right text-emerald-600">{inr(p.total_paid)}</td>
                <td className="px-5 py-4 text-right font-bold" style={{ color: (p.due_amount||0) > 0 ? '#dc2626' : '#059669' }}>{inr(p.due_amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Project" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Project Name" value={form.name} onChange={v => setForm(s => ({ ...s, name: v }))} required />
          <Select label="Client" value={form.client_id} onChange={v => setForm(s => ({ ...s, client_id: v }))} options={clientOpts} />
          <Input label="Location" value={form.location} onChange={v => setForm(s => ({ ...s, location: v }))} />
          <Input label="Total Amount (₹)" value={form.total_amount} onChange={v => setForm(s => ({ ...s, total_amount: v }))} type="number" />
          <Select label="Status" value={form.status} onChange={v => setForm(s => ({ ...s, status: v }))} options={statusOpts} />
          <Input label="Progress (%)" value={form.progress} onChange={v => setForm(s => ({ ...s, progress: v }))} type="number" />
          <Input label="Start Date" value={form.start_date} onChange={v => setForm(s => ({ ...s, start_date: v }))} type="date" />
          <Input label="Deadline" value={form.deadline} onChange={v => setForm(s => ({ ...s, deadline: v }))} type="date" />
        </div>
        <div className="mt-4"><Textarea label="Description" value={form.description} onChange={v => setForm(s => ({ ...s, description: v }))} /></div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setShowAdd(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleAdd} disabled={saving || !form.name.trim()}>{saving ? 'Saving...' : 'Add Project'}</PortalButton>
        </div>
      </Modal>
    </div>
  )
}
