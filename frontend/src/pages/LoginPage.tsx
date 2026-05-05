import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePortalAuth } from '../portal/auth'
import { LoginSplash } from '../portal/LoginSplash'
import heroBg from '../assets/hero-bg.png'
import { HardHat, Eye, EyeOff, ArrowRight } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = usePortalAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [ready, setReady] = useState(false)

  // If already logged in (but NOT mid-splash), go to dashboard
  useEffect(() => { if (user && !showSplash) navigate('/portal/dashboard', { replace: true }) }, [user, navigate, showSplash])

  // Initial loading animation
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2200)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim() || !password.trim()) return
    setError('')
    setLoading(true)
    try {
      await login(userId.trim(), password)
      setShowSplash(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  const onSplashComplete = useCallback(() => {
    navigate('/portal/dashboard')
  }, [navigate])

  // Post-login splash
  if (showSplash) {
    return <LoginSplash onComplete={onSplashComplete} />
  }

  // ─── Initial Loading Splash ───
  if (!ready) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
      >
        {/* Ambient glow */}
        <motion.div
          className="absolute h-[400px] w-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl shadow-orange-500/30"
        >
          <HardHat className="h-10 w-10 text-white" />
        </motion.div>

        {/* Brand name */}
        <motion.div
          className="mt-7 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-2xl font-extrabold tracking-tight text-white">BAJAJ DEVELOPER</div>
          <div className="mt-1 text-sm font-bold tracking-[0.3em] text-orange-400/80">CONSTRUCTIONS</div>
        </motion.div>

        {/* Loading bar */}
        <div className="mt-10 w-48">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400"
              style={{
                animation: 'loadFill 1.8s 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                width: '0%',
              }}
            />
          </div>
          <style>{`@keyframes loadFill { to { width: 100%; } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-bleed background */}
      <img
        src={heroBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark overlay + gradient */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-orange-900/30" />

      {/* Decorative glows */}
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-orange-500/20 blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[120px]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glass card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
              <HardHat className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
              BAJAJ DEVELOPER
            </h1>
            <p className="text-lg font-bold text-orange-400 tracking-wide">
              CONSTRUCTIONS
            </p>
            <p className="mt-2 text-sm text-slate-300/80">
              Sign in to the admin portal
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 backdrop-blur">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300/70">
                User ID
              </label>
              <input
                type="text"
                placeholder="Enter your user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoFocus
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-sm font-medium text-white placeholder:text-slate-400/60 outline-none ring-orange-400/40 backdrop-blur transition focus:border-orange-400/50 focus:ring-2 focus:bg-white/[0.1]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300/70">
                Password
              </label>
              <div className="relative mt-2">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 pr-12 text-sm font-medium text-white placeholder:text-slate-400/60 outline-none ring-orange-400/40 backdrop-blur transition focus:border-orange-400/50 focus:ring-2 focus:bg-white/[0.1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400/60 hover:text-white transition"
                >
                  {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !userId.trim() || !password.trim()}
              className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/35 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[11px] font-medium text-slate-400/50">
            Designed and developed by{' '}
            <span className="font-bold text-slate-300/60">BN IntelHub Pvt.Ltd</span>
          </p>
        </div>
      </div>
    </div>
  )
}
