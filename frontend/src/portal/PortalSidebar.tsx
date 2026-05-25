import { NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { portalNav } from './portalNav'
import { BrandLogo } from './BrandLogo'

export function PortalSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white/95 shadow-[18px_0_60px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <BrandLogo className="h-12 w-12 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.10)]" />
          <div>
            <div className="text-base font-extrabold leading-tight tracking-[-0.03em] text-slate-950">R.G INFRA</div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">CRM SUITE</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-auto px-4 py-5">
          <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Workspace</div>
          <div className="space-y-1.5">
            {portalNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-orange-50 to-white text-orange-700 shadow-[0_10px_24px_rgba(249,115,22,0.10)] ring-1 ring-orange-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${isActive ? 'bg-orange-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.22)]' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-orange-600 group-hover:shadow-sm'}`}>
                      <item.Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-orange-500" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="rounded-lg border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-slate-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <Sparkles className="h-4 w-4 text-orange-500" />
              Designed and Developed By
            </div>
            <div className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
              © {new Date().getFullYear()} BN IntelHub Pvt. Ltd. 
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
