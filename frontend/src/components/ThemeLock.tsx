import { useLayoutEffect } from 'react'
import { applyThemeTemporary, type Theme } from '../lib/theme'

export function ThemeLock({ theme }: { theme: Theme }) {
  useLayoutEffect(() => {
    const prev = document.documentElement.dataset.theme
    applyThemeTemporary(theme)
    return () => {
      applyThemeTemporary(prev === 'light' ? 'light' : 'dark')
    }
  }, [theme])

  return null
}

