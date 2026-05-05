import { NavLink } from 'react-router-dom'
import { portalNav } from './portalNav'

export function PortalSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white font-extrabold text-sm">
            BD
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900 leading-tight">Bajaj Developer</div>
            <div className="text-[10px] font-semibold text-slate-400 tracking-wider">CONSTRUCTIONS</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-auto px-3 py-4">
          <div className="space-y-1">
            {portalNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <item.Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="text-[11px] font-semibold text-slate-400">
            © {new Date().getFullYear()} Bajaj Developer Constructions
          </div>
        </div>
      </aside>
    </>
  )
}
