import { createContext, useContext, useMemo, useRef, useState } from 'react'

type PortalSearchState = {
  query: string
  setQuery: (v: string) => void
  focus: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

const Ctx = createContext<PortalSearchState | null>(null)

export function PortalSearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const value = useMemo<PortalSearchState>(() => {
    return {
      query,
      setQuery,
      inputRef,
      focus: () => inputRef.current?.focus(),
    }
  }, [query])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePortalSearch() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortalSearch must be used within PortalSearchProvider')
  return ctx
}

