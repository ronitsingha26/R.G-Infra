import { LogOut, Menu } from 'lucide-react'
import { usePortalAuth } from './auth'

export function PortalTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = usePortalAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="lg:hidden text-slate-600 hover:text-slate-900">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block text-sm font-semibold text-slate-500">
          {new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-bold text-slate-900">{user?.name || 'Admin'}</div>
          <div className="text-[11px] font-semibold text-slate-400">{user?.role || 'admin'}</div>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
