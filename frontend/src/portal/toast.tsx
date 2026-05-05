import { createContext, useCallback, useContext, useState } from 'react'

type Toast = { id: number; tone: 'success' | 'error' | 'warning' | 'info'; title: string }

type ToastCtx = { push: (t: Omit<Toast, 'id'>) => void }

const Ctx = createContext<ToastCtx | null>(null)

export function PortalToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now()
    setToasts((s) => [...s, { ...t, id }])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 3500)
  }, [])

  const toneColors: Record<string, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-orange-50 border-orange-200 text-orange-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-slide-up rounded-xl border px-5 py-3 text-sm font-semibold shadow-lg ${toneColors[t.tone] || toneColors.info}`}>
            {t.title}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function usePortalToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortalToast must be used within PortalToastProvider')
  return ctx
}
