import { useEffect, useMemo, useState } from 'react'
import { applyTheme, getPreferredTheme, type Theme } from '../lib/theme'

function readDomTheme(): Theme {
  const v = document.documentElement.dataset.theme
  return v === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark'
    return readDomTheme()
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    // keep in sync in case initTheme ran before React mount
    const preferred = getPreferredTheme()
    applyTheme(preferred)
    setTheme(readDomTheme())

    const obs = new MutationObserver(() => setTheme(readDomTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const api = useMemo(() => {
    return {
      theme,
      isDark: theme === 'dark',
      setTheme: (t: Theme) => {
        applyTheme(t)
        setTheme(t)
      },
      toggle: () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        setTheme(next)
      },
    }
  }, [theme])

  return api
}

