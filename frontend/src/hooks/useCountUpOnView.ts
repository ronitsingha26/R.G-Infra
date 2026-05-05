import { useInView } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

export function useCountUpOnView({
  value,
  durationMs = 900,
  delayMs = 0,
  once = true,
}: {
  value: number
  durationMs?: number
  delayMs?: number
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once, margin: '-20% 0px -20% 0px' })
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    let start: number | null = null
    const startAt = performance.now() + delayMs

    const tick = (t: number) => {
      if (t < startAt) {
        raf = requestAnimationFrame(tick)
        return
      }
      if (start === null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [delayMs, durationMs, inView, value])

  const display = useMemo(() => (inView ? n : 0), [inView, n])
  return { ref, inView, display }
}

