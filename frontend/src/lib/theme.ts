export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'abc_theme_v1'

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function getPreferredTheme(): Theme {
  const stored = getStoredTheme()
  if (stored) return stored
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)')?.matches)
    return 'light'
  return 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore storage failures (private mode, blocked, etc.)
  }
}

export function applyThemeTemporary(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function initTheme() {
  if (typeof document === 'undefined') return
  applyTheme(getPreferredTheme())
}

