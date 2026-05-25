/* ─── Light-Theme Portal UI Components ─── */

import type React from 'react'

/* ─── Card ─── */
export function PortalCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`rounded-lg border border-slate-200/80 bg-white/95 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] ring-1 ring-white/70 transition duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_55px_rgba(15,23,42,0.09)]' : ''} ${className}`}
      onClick={onClick}
    >
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
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold tracking-[-0.01em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/35 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px'
  const variants = {
    primary: 'border border-orange-500 bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_10px_26px_rgba(249,115,22,0.24)] hover:from-orange-400 hover:to-orange-600 hover:shadow-[0_14px_34px_rgba(249,115,22,0.28)]',
    outline: 'border border-slate-200 bg-white/90 text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:border-orange-200 hover:bg-orange-50/50 hover:text-slate-950',
    danger: 'border border-red-500 bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_10px_26px_rgba(239,68,68,0.20)] hover:from-red-400 hover:to-red-600',
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
      <label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-slate-400 outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4 disabled:bg-slate-100 disabled:text-slate-500"
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
      <label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
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
      <label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-slate-400 outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4"
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
  return <span className={`rounded-full border border-current/10 px-3 py-1 text-xs font-bold shadow-sm ${tone}`}>{status}</span>
}

/* ─── INR formatter ─── */
export function inr(amount: number | string | undefined): string {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/* ─── Modal ─── */
export function Modal({
  open, onClose, title, children, wide = false, closeOnBackdropClick = true,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; closeOnBackdropClick?: boolean
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 backdrop-blur-md p-4"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} animate-slide-up rounded-lg border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)] ring-1 ring-white/80 max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="font-heading text-xl font-extrabold tracking-[-0.02em] text-slate-900">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xl font-bold text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">×</button>
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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-2xl shadow-sm">📭</div>
      <div className="text-lg font-bold text-slate-700">{title}</div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  )
}
