import { useEffect, useRef } from 'react'

type Props = {
  onComplete: () => void
}

export function LoginSplash({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    const show = (selector: string, delay: number) => {
      timers.push(setTimeout(() => {
        const el = containerRef.current?.querySelector<HTMLElement>(selector)
        if (el) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0) scale(1) rotate(0deg)'
        }
      }, delay))
    }

    show('.ls-icon', 150)
    show('.ls-brand', 600)
    show('.ls-welcome', 1200)
    show('.ls-bar', 1900)

    // Fill progress bar
    timers.push(setTimeout(() => {
      const fill = containerRef.current?.querySelector<HTMLElement>('.ls-bar-fill')
      if (fill) fill.style.width = '100%'
    }, 1950))

    // Fade out container
    timers.push(setTimeout(() => {
      if (containerRef.current) containerRef.current.style.opacity = '0'
    }, 3300))

    timers.push(setTimeout(() => onComplete(), 3900))

    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const base: React.CSSProperties = {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    opacity: 0,
    transition: 'opacity 0.5s ease, transform 0.55s cubic-bezier(0.34,1.2,0.64,1)',
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        transition: 'opacity 0.6s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Orange ambient glow */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'lsPulse 2.5s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes lsPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
        @keyframes lsBarFill { to{width:100%} }
      `}</style>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Icon */}
        <div
          className="ls-icon"
          style={{
            ...base,
            transform: 'scale(0.4) rotate(-160deg)',
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(249,115,22,0.4)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2v2Z"/>
            <path d="M20 15a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2h16Z"/>
            <path d="M20 15V9a8 8 0 1 0-16 0v6"/>
            <path d="M12 1v2"/>
          </svg>
        </div>

        {/* Brand */}
        <div
          className="ls-brand"
          style={{ ...base, transform: 'translateY(22px)', marginTop: 32, textAlign: 'center' }}
        >
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            BAJAJ DEVELOPER
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', letterSpacing: '0.3em', marginTop: 4 }}>
            CONSTRUCTIONS
          </div>
        </div>

        {/* Welcome */}
        <div
          className="ls-welcome"
          style={{ ...base, transform: 'translateY(16px)', marginTop: 28, textAlign: 'center' }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
            Welcome to
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 4 }}>
            Bajaj Developers 🏗️
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="ls-bar"
          style={{ ...base, transform: 'translateY(10px)', marginTop: 36, width: 210 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'center', marginBottom: 10, letterSpacing: '0.04em' }}>
            Preparing your admin portal...
          </div>
          <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div
              className="ls-bar-fill"
              style={{
                height: '100%',
                width: '0%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #f97316, #fb923c, #fbbf24)',
                transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
