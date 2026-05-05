/* ─── Light-Theme Portal UI Components ─── */

import type React from 'react'

/* ─── Card ─── */
export function PortalCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

/* ─── Button ─── */
export function PortalButton({
  children, onClick, variant = 'primary', disabled = false, type = 'button', className = '',
}: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'danger'
  disabled?: boolean; type?: 'button' | 'submit'; className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

/* ─── Input ─── */
export function Input({
  label, value, onChange, type = 'text', placeholder = '', disabled = false, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; disabled?: boolean; required?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-orange-400/40 transition focus:border-orange-400 focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  )
}

/* ─── Select ─── */
export function Select({
  label, value, onChange, options, placeholder = 'Select...', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-orange-400/40 transition focus:border-orange-400 focus:ring-2"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/* ─── Textarea ─── */
export function Textarea({
  label, value, onChange, rows = 3, placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-orange-400/40 transition focus:border-orange-400 focus:ring-2"
      />
    </div>
  )
}

/* ─── Status Badge ─── */
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Completed' || status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
    status === 'Ongoing' || status === 'Pending' ? 'bg-orange-100 text-orange-700' :
    status === 'Delayed' || status === 'Overdue' ? 'bg-red-100 text-red-700' :
    'bg-blue-100 text-blue-700'
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>
}

/* ─── INR formatter ─── */
export function inr(amount: number | string | undefined): string {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/* ─── Modal ─── */
export function Modal({
  open, onClose, title, children, wide = false,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl font-extrabold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─── Empty State ─── */
export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📭</div>
      <div className="text-lg font-bold text-slate-700">{title}</div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  )
}
