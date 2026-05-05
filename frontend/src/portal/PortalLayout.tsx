import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PortalSidebar } from './PortalSidebar'
import { PortalTopbar } from './PortalTopbar'
import { PortalStoreProvider } from './store'
import { PortalToastProvider, usePortalToast } from './toast'
import { useSocket } from './socket'

function RealTimeAlerts() {
  const toast = usePortalToast()

  useSocket((event) => {
    switch (event.type) {
      case 'payment_added': {
        const d = event.data as { client_name?: string; amount?: number } | undefined
        toast.push({ tone: 'success', title: `💰 Payment received: ₹${Number(d?.amount || 0).toLocaleString('en-IN')} from ${d?.client_name || 'a client'}` })
        break
      }
      case 'new_enquiry': {
        const d = event.data as { name?: string } | undefined
        toast.push({ tone: 'info', title: `📩 New enquiry from ${d?.name || 'someone'} on the website` })
        break
      }
      case 'project_added': {
        const d = event.data as { name?: string } | undefined
        toast.push({ tone: 'info', title: `🏗️ New project added: ${d?.name || ''}` })
        break
      }
      case 'client_added': {
        const d = event.data as { company_name?: string } | undefined
        toast.push({ tone: 'info', title: `👤 New client added: ${d?.company_name || ''}` })
        break
      }
      case 'receipt_sent':
        toast.push({ tone: 'success', title: '✉️ Payment receipt email sent' })
        break
      case 'due_reminder_sent':
        toast.push({ tone: 'warning', title: '⚠️ Due payment reminder sent' })
        break
    }
  })

  return null
}

export function PortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <PortalStoreProvider>
      <PortalToastProvider>
        <RealTimeAlerts />
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
          <PortalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <PortalTopbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />
            <main className="flex-1 overflow-y-auto p-6">
              <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>}>
                <Outlet />
              </Suspense>
            </main>
          </div>
        </div>
      </PortalToastProvider>
    </PortalStoreProvider>
  )
}
