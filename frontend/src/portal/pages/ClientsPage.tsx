import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Client } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, Textarea } from '../ui'

export function ClientsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_person: '', phone: '', email: '', address: '', city: '', state: '', gstin: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const filtered = store.clients.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.company_name?.toLowerCase().includes(q) || c.contact_person?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q)
  })

  const handleAdd = async () => {
    if (!form.company_name.trim()) return
    setSaving(true)
    try {
      await api.createClient(form as Partial<Client>)
      toast.push({ tone: 'success', title: 'Client added successfully' })
      setShowAdd(false)
      setForm({ company_name: '', contact_person: '', phone: '', email: '', address: '', city: '', state: '', gstin: '', notes: '' })
      store.refreshClients()
      store.refreshDashboard()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Clients</div>
            <div className="text-sm text-slate-500">{store.clients.length} total clients</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none ring-orange-400/40 focus:ring-2 w-56" />
            </div>
            <PortalButton onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Client</PortalButton>
          </div>
        </div>
      </PortalCard>

      {filtered.length === 0 ? <EmptyState title="No clients found" sub="Add your first client to get started" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3 text-right">Projects</th>
                <th className="px-5 py-3 text-right">Total Amount</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/portal/clients/${c.id}`)} className="cursor-pointer hover:bg-orange-50/50 transition text-slate-700">
                  <td className="px-5 py-4 font-bold text-slate-900">{c.company_name}</td>
                  <td className="px-5 py-4">{c.contact_person || '—'}</td>
                  <td className="px-5 py-4">{c.city || '—'}</td>
                  <td className="px-5 py-4 text-right">{c.total_projects || 0}</td>
                  <td className="px-5 py-4 text-right font-semibold">{inr(c.total_project_amount)}</td>
                  <td className="px-5 py-4 text-right text-emerald-600 font-semibold">{inr(c.total_paid)}</td>
                  <td className="px-5 py-4 text-right font-bold" style={{ color: (c.total_due || 0) > 0 ? '#dc2626' : '#059669' }}>{inr(c.total_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Client" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company Name" value={form.company_name} onChange={(v) => setForm(s => ({ ...s, company_name: v }))} required />
          <Input label="Contact Person" value={form.contact_person} onChange={(v) => setForm(s => ({ ...s, contact_person: v }))} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm(s => ({ ...s, phone: v }))} />
          <Input label="Email" value={form.email} onChange={(v) => setForm(s => ({ ...s, email: v }))} type="email" />
          <Input label="City" value={form.city} onChange={(v) => setForm(s => ({ ...s, city: v }))} />
          <Input label="State" value={form.state} onChange={(v) => setForm(s => ({ ...s, state: v }))} />
          <Input label="GSTIN" value={form.gstin} onChange={(v) => setForm(s => ({ ...s, gstin: v }))} />
          <Input label="Address" value={form.address} onChange={(v) => setForm(s => ({ ...s, address: v }))} />
        </div>
        <div className="mt-4">
          <Textarea label="Notes" value={form.notes} onChange={(v) => setForm(s => ({ ...s, notes: v }))} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setShowAdd(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleAdd} disabled={saving || !form.company_name.trim()}>{saving ? 'Saving...' : 'Add Client'}</PortalButton>
        </div>
      </Modal>
    </div>
  )
}
