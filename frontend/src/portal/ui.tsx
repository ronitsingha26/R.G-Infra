/* ─── Light-Theme Portal UI Components ─── */

import React, { useEffect, useRef, useState as useLocalState } from 'react'

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
  label, value, onChange, type = 'text', placeholder = '', disabled = false, required = false, maxLength, inputMode, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; disabled?: boolean; required?: boolean; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string
}) {
  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    if (type === 'number') {
      event.currentTarget.blur()
    }
  }

  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onWheel={type === 'number' ? handleWheel : undefined}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
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

/* ─── Searchable Select (Combobox) ─── */

export function SearchableSelect({
  label, value, onChange, options, placeholder = 'Search & select...', required = false, disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string; required?: boolean; disabled?: boolean
}) {
  const [open, setOpen] = useLocalState(false)
  const [query, setQuery] = useLocalState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function handleToggle() {
    if (disabled) return
    setOpen((prev) => {
      if (!prev) setTimeout(() => inputRef.current?.focus(), 50)
      else setQuery('')
      return !prev
    })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="mt-1.5 w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none ring-orange-400/25 transition focus:border-orange-400 focus:ring-4 disabled:bg-slate-100 disabled:text-slate-500 text-left"
        style={{ minHeight: '42px' }}
      >
        <span className={selectedLabel ? 'text-slate-900' : 'text-slate-400'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`ml-2 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            zIndex: 9999, background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 16px 48px rgba(15,23,42,0.16)',
            overflow: 'hidden',
          }}
        >
          {/* Search input inside dropdown */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8' }}
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search..."
                style={{
                  width: '100%', padding: '7px 10px 7px 32px',
                  border: '1px solid #e2e8f0', borderRadius: '7px',
                  fontSize: '13px', outline: 'none', color: '#0f172a',
                  background: '#f8fafc', boxSizing: 'border-box',
                }}
                onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), setQuery(''))}
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No results found</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '9px 14px',
                    fontSize: '13px',
                    background: o.value === value ? '#fff7ed' : 'transparent',
                    color: o.value === value ? '#ea580c' : '#1e293b',
                    fontWeight: o.value === value ? '700' : '500',
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    display: 'block',
                    border: 'none',
                    outline: 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = '#fafafa' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = o.value === value ? '#fff7ed' : 'transparent' }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
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
  const n = Number(amount || 0)
  const hasDecimals = n % 1 !== 0
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })
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
