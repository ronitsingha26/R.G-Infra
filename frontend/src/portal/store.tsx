import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, type Client, type Project, type Payment, type DashboardStats, type DueAlert, type ContactSubmission } from './api'
import { useSocket } from './socket'

type Store = {
  clients: Client[]
  projects: Project[]
  payments: Payment[]
  stats: DashboardStats | null
  dueAlerts: DueAlert[]
  recentPayments: Payment[]
  contactSubmissions: ContactSubmission[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshClients: () => Promise<void>
  refreshProjects: () => Promise<void>
  refreshPayments: () => Promise<void>
  refreshDashboard: () => Promise<void>
  refreshContacts: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function PortalStoreProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [dueAlerts, setDueAlerts] = useState<DueAlert[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshClients = useCallback(async () => { try { setClients(await api.getClients()) } catch (e) { console.error(e) } }, [])
  const refreshProjects = useCallback(async () => { try { setProjects(await api.getProjects()) } catch (e) { console.error(e) } }, [])
  const refreshPayments = useCallback(async () => { try { setPayments(await api.getPayments()) } catch (e) { console.error(e) } }, [])
  const refreshDashboard = useCallback(async () => {
    try {
      const [s, d, r] = await Promise.all([api.getDashboardStats(), api.getDueAlerts(), api.getRecentPayments()])
      setStats(s); setDueAlerts(d); setRecentPayments(r)
    } catch (e) { console.error(e) }
  }, [])
  const refreshContacts = useCallback(async () => { try { setContactSubmissions(await api.getContactSubmissions()) } catch (e) { console.error(e) } }, [])

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { await Promise.allSettled([refreshClients(), refreshProjects(), refreshPayments(), refreshDashboard(), refreshContacts()]) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load data') }
    finally { setLoading(false) }
  }, [refreshClients, refreshProjects, refreshPayments, refreshDashboard, refreshContacts])

  // Initial load
  useEffect(() => { refresh() }, [refresh])

  // ─── Socket.IO: auto-refresh when any data changes on the server ───
  useSocket((event) => {
    console.log('📡 Real-time update:', event.type)
    const t = event.type

    // Refresh the relevant data based on what changed
    if (t.startsWith('client_')) {
      refreshClients()
      refreshDashboard()
    } else if (t.startsWith('project_')) {
      refreshProjects()
      refreshClients()
      refreshDashboard()
    } else if (t.startsWith('payment_') || t === 'receipt_sent' || t === 'due_reminder_sent') {
      refreshPayments()
      refreshProjects()
      refreshClients()
      refreshDashboard()
    } else if (t === 'new_enquiry' || t === 'contact_read') {
      refreshContacts()
      refreshDashboard()
    } else if (t.startsWith('schedule_') || t.startsWith('stage_') || t === 'stages_updated' || t.startsWith('demand_letter_') || t === 'due_reminders_processed') {
      refreshClients()
      refreshDashboard()
    } else if (t === 'work_projection_updated') {
      refreshClients()
      refreshDashboard()
    } else {
      // Unknown event — refresh everything
      refresh()
    }
  })

  const store = useMemo<Store>(() => ({
    clients, projects, payments, stats, dueAlerts, recentPayments, contactSubmissions,
    loading, error, refresh, refreshClients, refreshProjects, refreshPayments, refreshDashboard, refreshContacts,
  }), [clients, projects, payments, stats, dueAlerts, recentPayments, contactSubmissions, loading, error, refresh, refreshClients, refreshProjects, refreshPayments, refreshDashboard, refreshContacts])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function usePortalStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortalStore must be used within PortalStoreProvider')
  return ctx
}
