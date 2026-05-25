import { Download, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api, type DueInfo, type Payment, type PaymentInvoice } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Modal, PortalButton, PortalCard, Textarea } from '../ui'

export function PaymentsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const [search, setSearch] = useState('')
  const [payModal, setPayModal] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [dueInfo, setDueInfo] = useState<DueInfo | null>(null)
  const [dueLoading, setDueLoading] = useState(false)
  const [payForm, setPayForm] = useState({
    client_id: '',
    percentage: '',
    amount: '',
    amount_includes_gst: false,
    payment_mode: 'UPI',
    reference_no: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoicePayment, setInvoicePayment] = useState<Payment | null>(null)
  const [invoiceRows, setInvoiceRows] = useState<PaymentInvoice[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceGeneratingId, setInvoiceGeneratingId] = useState<number | null>(null)

  const formatInvoiceDate = (value?: string) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const filteredClients = store.clients.filter((client) => {
    const q = clientSearch.toLowerCase()
    if (!q) return true
    return (
      (client.name || client.company_name || '').toLowerCase().includes(q) ||
      (client.unique_client_id || '').toLowerCase().includes(q) ||
      (client.phone || '').toLowerCase().includes(q) ||
      (client.property_name || '').toLowerCase().includes(q) ||
      (client.apartment_name || '').toLowerCase().includes(q) ||
      (client.flat_number || '').toLowerCase().includes(q)
    )
  })

  const getClientLabel = (clientId: string) => {
    const client = store.clients.find((item) => item.id === Number(clientId))
    if (!client) return ''
    return `${client.name || client.company_name || 'Client'} • ${client.property_name ? `${client.property_name} - ` : ''}${client.apartment_name ? `${client.apartment_name} - Flat ${client.flat_number}` : 'No Flat Assigned'}`
  }

  // When percentage changes:
  const handlePercentageChange = (pct: string) => {
    const p = parseFloat(pct);
    if (isNaN(p) || !payForm.client_id) {
       setPayForm(s => ({ ...s, percentage: pct, amount: '', amount_includes_gst: false }));
       return;
    }
    const client = store.clients.find(c => c.id === Number(payForm.client_id));
    if (client) {
       const amt = Math.round((Number(client.total_amount || 0) * p) / 100);
       setPayForm(s => ({ ...s, percentage: pct, amount: String(amt), amount_includes_gst: false }));
    } else {
       setPayForm(s => ({ ...s, percentage: pct, amount: '', amount_includes_gst: false }));
    }
  }

  // Handle client change
  const handleClientChange = async (clientId: string) => {
    setPayForm(s => ({ ...s, client_id: clientId }));
    setClientSearch(getClientLabel(clientId));
    setDueInfo(null);
    if (payForm.percentage) {
      const client = store.clients.find(c => c.id === Number(clientId));
      if (client) {
        const amt = Math.round((Number(client.total_amount || 0) * parseFloat(payForm.percentage)) / 100);
        setPayForm(s => ({ ...s, client_id: clientId, amount: String(amt), amount_includes_gst: false }));
      }
    }
    if (!clientId) return;

    setDueLoading(true);
    try {
      const data = await api.getClientDues(Number(clientId));
      setDueInfo(data);
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Unable to load payment schedule' });
    } finally {
      setDueLoading(false);
    }
  }

  const handleAddPayment = async () => {
    if (!payForm.client_id || !payForm.amount) return;
    setSaving(true);
    try {
      await api.addClientPayment({
        client_id: Number(payForm.client_id),
        amount: Number(payForm.amount),
        amount_includes_gst: payForm.amount_includes_gst,
        payment_percentage: payForm.percentage ? Number(payForm.percentage) : undefined,
        payment_date: payForm.payment_date,
        payment_mode: payForm.payment_mode,
        reference_no: payForm.reference_no,
        notes: payForm.notes
      });
      toast.push({ tone: 'success', title: 'Payment recorded successfully' });
      setPayModal(false);
      setClientSearch('');
      setDueInfo(null);
      store.refreshPayments();
      store.refreshClients();
      store.refreshDashboard();
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to add payment' });
    } finally {
      setSaving(false);
    }
  }

  const openInvoiceModal = async (payment: Payment) => {
    setInvoicePayment(payment)
    setInvoiceModalOpen(true)
    setInvoiceLoading(true)
    try {
      const rows = await api.getPaymentInvoices(payment.id)
      setInvoiceRows(rows)
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to load invoices' })
      setInvoiceRows([])
    } finally {
      setInvoiceLoading(false)
    }
  }

  const handleGenerateInvoice = async (payment: Payment) => {
    setInvoiceGeneratingId(payment.id)
    try {
      const invoice = await api.generateInvoice(payment.id)
      toast.push({ tone: 'success', title: 'Invoice generated' })
      window.open(invoice.file_url, '_blank')
      if (invoicePayment?.id === payment.id) {
        setInvoiceRows((rows) => [invoice, ...rows])
      }
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to generate invoice' })
    } finally {
      setInvoiceGeneratingId(null)
    }
  }

  const filtered = store.payments.filter(p => {
    const q = search.toLowerCase()
    return !q || p.client_name?.toLowerCase().includes(q) || p.project_name?.toLowerCase().includes(q) || p.reference_no?.toLowerCase().includes(q) || p.client_phone?.toLowerCase().includes(q)
  })

  const total = filtered.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Payments</div>
            <div className="text-sm text-slate-500">{store.payments.length} total payments • Total: {inr(total)}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:ring-2 w-56" />
            </div>
            <PortalButton onClick={() => { setPayModal(true); setClientSearch('') }}>
              <Plus className="h-4 w-4" /> Add Payment
            </PortalButton>
          </div>
        </div>
      </PortalCard>

      {filtered.length === 0 ? <EmptyState title="No payments found" sub="Payments will appear here when added from projects" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Project</th><th className="px-5 py-3">Mode</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{filtered.map(p => (
              <tr key={p.id} className="text-slate-700">
                <td className="px-5 py-4">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-5 py-4 font-semibold">{p.client_name || '—'}</td>
                <td className="px-5 py-4">{p.project_name || '—'}</td>
                <td className="px-5 py-4">{p.payment_mode || '—'}</td>
                <td className="px-5 py-4 text-xs">{p.reference_no || '—'}</td>
                <td className="px-5 py-4 text-right font-bold text-emerald-600">{inr(p.amount)}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <PortalButton
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => handleGenerateInvoice(p)}
                      disabled={invoiceGeneratingId === p.id}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {invoiceGeneratingId === p.id ? 'Generating...' : 'Generate'}
                    </PortalButton>
                    <PortalButton
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => openInvoiceModal(p)}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </PortalButton>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to delete this payment record?')) return;
                      try {
                        await api.deletePayment(p.id);
                        toast.push({ tone: 'success', title: 'Payment deleted' });
                        store.refreshPayments();
                      } catch (e) {
                        toast.push({ tone: 'error', title: 'Failed to delete' });
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record New Payment" wide closeOnBackdropClick={false}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Client Selection */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Select Client</label>
            <Input
              label="Search Client"
              value={clientSearch}
              onChange={setClientSearch}
              placeholder="Type client name, flat, property, or phone"
            />
            <select
              value={payForm.client_id}
              onChange={(e) => handleClientChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-400/10"
            >
              <option value="">-- Choose a Client --</option>
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name || c.company_name} • {c.property_name ? `${c.property_name} - ` : ''}{c.apartment_name ? `${c.apartment_name} - Flat ${c.flat_number}` : 'No Flat Assigned'}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-500">Showing {filteredClients.length} of {store.clients.length} clients</div>
          </div>

          {payForm.client_id && (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {dueLoading ? (
                <div className="text-sm font-semibold text-slate-500">Loading client dues...</div>
              ) : dueInfo ? (
                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400">Flat Value</div>
                    <div className="font-extrabold text-slate-900">{inr(dueInfo.total_flat_amount)}</div>
                    {Number(dueInfo.gst_percent || 0) > 0 && (
                      <div className="text-xs text-slate-500">GST {Number(dueInfo.gst_percent || 0)}% extra</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">Paid</div>
                    <div className="font-extrabold text-emerald-600">{inr(dueInfo.total_paid)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">Remaining</div>
                    <div className="font-extrabold text-red-600">{inr(dueInfo.total_due)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">Due Now</div>
                    <div className="font-extrabold text-orange-600">{inr(dueInfo.combined_due)}</div>
                    {Number(dueInfo.gst_amount || 0) > 0 && (
                      <div className="text-xs text-slate-500">+ GST {inr(dueInfo.gst_amount)}</div>
                    )}
                  </div>
                  {Number(dueInfo.total_payable || 0) > 0 && (
                    <div>
                      <div className="text-xs font-bold text-slate-400">Payable With GST</div>
                      <div className="font-extrabold text-emerald-600">{inr(dueInfo.total_payable)}</div>
                    </div>
                  )}
                  <div className="sm:col-span-4 text-xs text-slate-500">
                    Current: <span className="font-bold text-slate-700">{dueInfo.current_stage || 'All stages paid'}</span>
                    {dueInfo.next_stage ? <> • Next: <span className="font-bold text-slate-700">{dueInfo.next_stage}</span></> : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-500">Select a client to load dues.</div>
              )}
            </div>
          )}

          {/* Amount Calculation */}
          <Input
            label="Percentage of Flat Value (%)"
            value={payForm.percentage}
            onChange={handlePercentageChange}
            type="number"
            placeholder="e.g. 10"
            disabled={!payForm.client_id}
          />
          <Input
            label="Payment Amount (₹)"
            value={payForm.amount}
            onChange={(v) => setPayForm(s => ({ ...s, amount: v, percentage: '', amount_includes_gst: false }))}
            type="number"
            required
            placeholder="e.g. 150000"
          />
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={payForm.amount_includes_gst}
                onChange={(e) => setPayForm(s => ({ ...s, amount_includes_gst: e.target.checked, percentage: e.target.checked ? '' : s.percentage }))}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
              />
              Amount entered includes GST
            </label>
            {dueInfo && Number(dueInfo.total_payable || 0) > 0 && (
              <button
                type="button"
                onClick={() => setPayForm(s => ({ ...s, amount: String(Math.round(Number(dueInfo.total_payable || 0))), percentage: '', amount_includes_gst: true }))}
                className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Use payable with GST: {inr(dueInfo.total_payable)}
              </button>
            )}
          </div>

          {/* Payment Details */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Payment Mode</label>
            <select
              value={payForm.payment_mode}
              onChange={(e) => setPayForm(s => ({ ...s, payment_mode: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-400/10"
            >
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Demand Draft">Demand Draft</option>
            </select>
          </div>

          <Input
            label="Reference / Transaction ID"
            value={payForm.reference_no}
            onChange={(v) => setPayForm(s => ({ ...s, reference_no: v }))}
            placeholder="Txn ID, Cheque No..."
          />

          <Input
            label="Payment Date"
            value={payForm.payment_date}
            onChange={(v) => setPayForm(s => ({ ...s, payment_date: v }))}
            type="date"
            required
          />

          <div className="md:col-span-2">
            <Textarea
              label="Additional Notes"
              value={payForm.notes}
              onChange={(v) => setPayForm(s => ({ ...s, notes: v }))}
              placeholder="Any remarks..."
              rows={2}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setPayModal(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleAddPayment} disabled={saving || !payForm.client_id || !payForm.amount}>
            {saving ? 'Saving...' : 'Record Payment'}
          </PortalButton>
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={`Invoices${invoicePayment?.client_name ? ` — ${invoicePayment.client_name}` : ''}`}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">Download latest and previous invoices for this payment.</p>
          {invoicePayment && (
            <PortalButton
              variant="outline"
              className="px-3 py-1.5 text-xs"
              onClick={() => handleGenerateInvoice(invoicePayment)}
              disabled={invoiceGeneratingId === invoicePayment.id}
            >
              <FileText className="h-3.5 w-3.5" />
              {invoiceGeneratingId === invoicePayment.id ? 'Generating...' : 'Generate'}
            </PortalButton>
          )}
        </div>

        {invoiceLoading ? (
          <div className="text-sm font-semibold text-slate-500">Loading invoices...</div>
        ) : invoiceRows.length ? (
          <div className="space-y-2">
            {invoiceRows.map((inv, index) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {inv.invoice_no}
                    {index === 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Latest</span>}
                  </div>
                  <div className="text-xs text-slate-500">{formatInvoiceDate(inv.generated_date)} • {inr(inv.amount)}</div>
                </div>
                <a
                  href={inv.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-orange-200 hover:bg-orange-50"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No invoices generated yet.</div>
        )}
      </Modal>
    </div>
  )
}
