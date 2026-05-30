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
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-orange-400 to-orange-500 shadow-[18px_0_60px_rgba(249,115,22,0.15)] transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-orange-300/50 px-6">
          <BrandLogo className="h-12 w-12 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.10)]" />
          <div>
            <div className="text-base font-extrabold leading-tight tracking-[-0.03em] text-white drop-shadow-sm">R.G INFRA</div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-orange-50">CRM SUITE</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-auto px-4 py-5">
          <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white drop-shadow-sm">Workspace</div>
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
                      ? 'bg-white text-orange-600 shadow-[0_10px_24px_rgba(0,0,0,0.10)]'
                      : 'text-white drop-shadow-sm hover:bg-white/20 hover:text-white',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${isActive ? 'bg-orange-100 text-orange-600 shadow-sm' : 'bg-orange-500/40 text-white shadow-sm group-hover:bg-white/30 group-hover:text-white'}`}>
                      <item.Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-orange-400" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-orange-300/50 px-5 py-5">
          <div className="rounded-lg border border-orange-300/30 bg-orange-500/20 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-black text-white drop-shadow-sm">
              <Sparkles className="h-4 w-4 text-orange-100" />
              Designed and Developed By
            </div>
            <div className="mt-1 text-[11px] font-semibold leading-relaxed text-orange-50">
              © {new Date().getFullYear()} BN IntelHub Pvt. Ltd. 
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
