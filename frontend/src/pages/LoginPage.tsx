import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePortalAuth } from '../portal/auth'
import { LoginSplash } from '../portal/LoginSplash'
import { BrandLogo } from '../portal/BrandLogo'
import { api } from '../portal/api'
import heroBg from '../assets/hero-bg.png'
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, MailCheck, ShieldCheck, UserRound } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = usePortalAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [ready, setReady] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotValue, setForgotValue] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

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
    setNotice('')
    setLoading(true)
    try {
      await login(userId.trim(), password)
      setShowSplash(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid user ID and password')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotValue.trim()) return
    setError('')
    setNotice('')
    setForgotLoading(true)
    try {
      const result = await api.forgotPassword(forgotValue.trim())
      setNotice(result.message || 'User ID and temporary password sent to email')
      setForgotOpen(false)
      setForgotValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send password email')
    } finally {
      setForgotLoading(false)
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
          className="flex h-28 w-56 items-center justify-center rounded-2xl border border-white/10 bg-white p-3 shadow-2xl shadow-orange-500/20"
        >
          <BrandLogo variant="full" className="h-full w-full" />
        </motion.div>

        {/* Brand name */}
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
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_72%,rgba(249,115,22,0.26),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.90),rgba(15,23,42,0.52),rgba(67,35,14,0.45))]" />

      {/* Decorative glows */}
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-orange-500/20 blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[120px]" />

      {/* Login Card */}
      <div className="relative z-10 mx-4 grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_430px] lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-200 shadow-lg backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            Secure Admin Portal
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-white">
            Control your CRM with clarity.
          </h1>
          <p className="mt-5 max-w-lg text-base font-medium leading-7 text-slate-200/80">
            Manage clients, payment history, dues, demand letters, and reports from one protected R.G INFRA workspace.
          </p>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {['Client Data', 'Payment Ledger', 'Due Alerts'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-bold text-white/85 backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[28px] border border-white/14 bg-white/[0.10] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-8"
        >

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-24 w-56 items-center justify-center rounded-2xl border border-white/20 bg-white p-3 shadow-[0_18px_45px_rgba(249,115,22,0.20)]">
              <BrandLogo variant="full" className="h-full w-full" />
            </div>
            <div className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Welcome Back</div>
            <p className="mt-2 text-sm font-medium text-slate-300/85">
              Sign in to the admin portal
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 backdrop-blur">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 backdrop-blur">
              {notice}
            </div>
          )}

          {/* Form */}
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300/70">
                User ID
              </label>
              <div className="relative mt-2">
                <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-200/75" />
                <input
                  type="text"
                  placeholder="Enter your user ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoFocus
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.09] px-4 py-4 pl-11 text-sm font-semibold text-white placeholder:text-slate-300/45 outline-none ring-orange-400/30 backdrop-blur transition focus:border-orange-300/70 focus:bg-white/[0.13] focus:ring-4"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300/70">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true)
                    setForgotValue(userId)
                    setError('')
                    setNotice('')
                  }}
                  className="text-xs font-extrabold text-orange-300 transition hover:text-orange-200"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-200/75" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.09] px-4 py-4 pl-11 pr-12 text-sm font-semibold text-white placeholder:text-slate-300/45 outline-none ring-orange-400/30 backdrop-blur transition focus:border-orange-300/70 focus:bg-white/[0.13] focus:ring-4"
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
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-600 px-4 py-4 text-sm font-black text-white shadow-[0_18px_42px_rgba(249,115,22,0.26)] transition hover:from-orange-400 hover:to-orange-600 hover:shadow-[0_20px_48px_rgba(249,115,22,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-300/55">
            <KeyRound className="h-3.5 w-3.5 text-orange-300/70" />
            Protected access for authorized R.G INFRA users
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center lg:col-start-2">
          <p className="text-[11px] font-medium text-slate-400/50">
            Designed and developed by{' '}
            <span className="font-bold text-slate-300/60">BN IntelHub Pvt. Ltd.</span>
          </p>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleForgotPassword}
            className="w-full max-w-md rounded-3xl border border-white/12 bg-slate-950/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-300/20">
              <MailCheck className="h-6 w-6" />
            </div>
            <div className="mt-5 text-xl font-black text-white">Forgot password</div>
            <p className="mt-2 text-sm leading-6 text-slate-300/75">
              Enter your user ID or registered email. A temporary password will be sent to the account email.
            </p>
            <input
              value={forgotValue}
              onChange={(e) => setForgotValue(e.target.value)}
              placeholder="User ID or email"
              className="mt-5 w-full rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-4 text-sm font-semibold text-white placeholder:text-slate-300/45 outline-none ring-orange-400/30 transition focus:border-orange-300/70 focus:ring-4"
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="flex-1 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.10]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading || !forgotValue.trim()}
                className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {forgotLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  )
}
