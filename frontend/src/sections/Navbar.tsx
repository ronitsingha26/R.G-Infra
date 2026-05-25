import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BrandLogo } from '../portal/BrandLogo'

const links = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'Team', href: '#team' },
  { label: 'Contact', href: '#contact' },
] as const

function useScrolled(threshold = 16) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export function Navbar() {
  const scrolled = useScrolled(18)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  const isLanding = location.pathname === '/'
  const navItems = useMemo(() => links, [])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className={[
            'transition-all',
            scrolled
              ? 'bg-slate-950/95 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur'
              : 'bg-transparent',
          ].join(' ')}
        >
          <div className="container-page flex h-16 items-center justify-between gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 font-heading text-base font-extrabold tracking-wide text-white"
            >
              <BrandLogo className="h-10 w-10 rounded-full border border-orange-400/30 bg-white p-1.5 shadow-sm" />
              <span>R.G INFRA</span>
            </Link>

            <nav className="hidden items-center gap-7 md:flex">
              {navItems.map((l) =>
                isLanding ? (
                  <a
                    key={l.label}
                    href={l.href}
                    className="relative text-sm font-semibold text-white/75 transition hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-orange-400 after:transition after:duration-300 hover:after:scale-x-100"
                  >
                    {l.label}
                  </a>
                ) : (
                  <NavLink
                    key={l.label}
                    to="/"
                    className="relative text-sm font-semibold text-white/75 transition hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-orange-400 after:transition after:duration-300 hover:after:scale-x-100"
                  >
                    {l.label}
                  </NavLink>
                ),
              )}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/login"
                className="btn btn-primary px-5 py-2.5 text-sm hover:scale-[1.03] active:scale-[0.99]"
              >
                Login to Portal
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 backdrop-blur transition hover:bg-white/10 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60"
              aria-label="Close menu overlay"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed right-0 top-0 z-50 h-full w-[86%] max-w-sm border-l border-white/10 bg-slate-950/95 backdrop-blur"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2 font-heading font-extrabold">
                  <BrandLogo className="h-8 w-8 rounded-full bg-white p-1" />
                  <span>R.G INFRA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 transition hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 pb-6 pt-2">
                <div className="space-y-2">
                  {navItems.map((l) =>
                    isLanding ? (
                      <a
                        key={l.label}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        key={l.label}
                        to="/"
                        onClick={() => setOpen(false)}
                        className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                      >
                        {l.label}
                      </Link>
                    ),
                  )}
                </div>

                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="btn btn-primary mt-5 w-full hover:scale-[1.02] active:scale-[0.99]"
                >
                  Login to Portal
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
