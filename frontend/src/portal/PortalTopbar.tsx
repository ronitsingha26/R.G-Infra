import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bell, CalendarClock, CalendarDays, CreditCard, LogOut, Mail, Menu, ShieldCheck } from 'lucide-react'
import { api, type PendingDue, type ReminderLog } from './api'
import { usePortalAuth } from './auth'
import { usePortalStore } from './store'
import { useSocket } from './socket'

const DAY_MS = 24 * 60 * 60 * 1000

function parseYmd(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3 && parts.every((p) => !Number.isNaN(p))) {
    const [y, m, d] = parts
    return new Date(y, m - 1, d)
  }
  const parsed = new Date(dateStr)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatShortDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = parseYmd(value)
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date)
}

function NotificationSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function PortalTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = usePortalAuth()
  const store = usePortalStore()
  const [pendingDues, setPendingDues] = useState<PendingDue[]>([])
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
  const [openNotifications, setOpenNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const refreshPendingDues = useCallback(async () => {
    try {
      setPendingDues(await api.getPendingDues())
    } catch {
      /* silent */
    }
  }, [])

  const refreshReminderLogs = useCallback(async () => {
    try {
      setReminderLogs(await api.getReminderLogs())
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    refreshPendingDues()
    refreshReminderLogs()
  }, [refreshPendingDues, refreshReminderLogs])

  useEffect(() => {
    if (!openNotifications) return
    const handler = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpenNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openNotifications])

  useSocket((event) => {
    const t = event.type
    if (t.startsWith('payment_') || t === 'receipt_sent') {
      refreshPendingDues()
    }
    if (t === 'due_reminder_sent' || t === 'due_reminders_processed') {
      refreshReminderLogs()
      refreshPendingDues()
    }
    if (t.startsWith('schedule_') || t.startsWith('stage_') || t === 'stages_updated') {
      refreshPendingDues()
    }
  })

  const upcomingDues = useMemo(() => {
    const today = startOfDay(new Date())
    return pendingDues
      .map((d) => {
        const dueDate = parseYmd(d.current_due_date || d.next_due_date)
        if (!dueDate) return null
        const diff = Math.round((startOfDay(dueDate).getTime() - today.getTime()) / DAY_MS)
        if (diff !== 1 && diff !== 2) return null
        return {
          id: `due-${d.client_id}-${dueDate.toISOString()}`,
          label: diff === 1 ? 'Due tomorrow' : 'Due in 2 days',
          dueDate,
          amount: d.current_due ?? d.current_stage_due ?? d.combined_due,
          clientName: d.client_name,
          apartmentName: d.apartment_name,
          flatNumber: d.flat_number,
        }
      })
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5)
  }, [pendingDues])

  const paymentNotices = useMemo(() => {
    return (store.recentPayments || []).slice(0, 5).map((p) => ({
      id: `payment-${p.id}`,
      clientName: p.client_name || 'Client',
      amount: p.amount || 0,
      date: p.payment_date || p.created_at || '',
      apartmentName: p.apartment_name,
      flatNumber: p.flat_number,
    }))
  }, [store.recentPayments])

  const emailNotices = useMemo(() => {
    return reminderLogs
      .filter((l) => l.email_status === 'sent' || l.email_sent)
      .sort((a, b) => new Date(b.sent_on).getTime() - new Date(a.sent_on).getTime())
      .slice(0, 5)
      .map((l) => ({
        id: `mail-${l.id}`,
        clientName: l.client_name || 'Client',
        amount: l.combined_due || l.current_stage_due || 0,
        sentOn: l.sent_on,
        apartmentName: l.apartment_name,
        flatNumber: l.flat_number,
      }))
  }, [reminderLogs])

  const badgeCount = upcomingDues.length + paymentNotices.length + emailNotices.length
  const badgeLabel = badgeCount > 9 ? '9+' : String(badgeCount)

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 shadow-[0_10px_34px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-slate-900 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <CalendarDays className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Today</div>
            <div className="text-sm font-bold text-slate-700">
              {new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpenNotifications((o) => !o)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-slate-900"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white shadow-[0_6px_12px_rgba(249,115,22,0.35)]">
                {badgeLabel}
              </span>
            )}
          </button>
          {openNotifications && (
            <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Notifications</div>
                <div className="text-xs font-semibold text-slate-500">{badgeCount} total</div>
              </div>
              <div className="max-h-[360px] space-y-4 overflow-y-auto px-4 py-4">
                <NotificationSection title="Upcoming dues">
                  {upcomingDues.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      No dues in the next two days
                    </div>
                  )}
                  {upcomingDues.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{item.clientName}</div>
                        <div className="text-xs font-semibold text-slate-600">
                          {item.apartmentName} · Flat {item.flatNumber} · ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-semibold text-orange-700">{item.label} · {formatShortDate(item.dueDate.toISOString().slice(0, 10))}</div>
                      </div>
                    </div>
                  ))}
                </NotificationSection>

                <NotificationSection title="Payments received">
                  {paymentNotices.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      No recent payments
                    </div>
                  )}
                  {paymentNotices.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{item.clientName}</div>
                        <div className="text-xs font-semibold text-slate-600">
                          {item.apartmentName ? `${item.apartmentName} · ` : ''}{item.flatNumber ? `Flat ${item.flatNumber} · ` : ''}₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700">Received · {formatShortDate(item.date)}</div>
                      </div>
                    </div>
                  ))}
                </NotificationSection>

                <NotificationSection title="Emails sent">
                  {emailNotices.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      No reminder emails sent recently
                    </div>
                  )}
                  {emailNotices.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{item.clientName}</div>
                        <div className="text-xs font-semibold text-slate-600">
                          {item.apartmentName} · Flat {item.flatNumber} · ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-semibold text-sky-700">Reminder sent · {formatShortDate(item.sentOn)}</div>
                      </div>
                    </div>
                  ))}
                </NotificationSection>
              </div>
            </div>
          )}
        </div>
        <div className="hidden items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-black text-white shadow-[0_8px_18px_rgba(249,115,22,0.22)]">
            {(user?.name || 'Admin').slice(0, 1).toUpperCase()}
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold tracking-[-0.02em] text-slate-950">{user?.name || 'Admin'}</div>
            <div className="flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              {user?.role || 'admin'}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
