import { motion } from 'framer-motion'
import { HardHat } from 'lucide-react'

export function BrandedLoader({
  label = 'Loading…',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={['grid place-items-center py-10', className].join(' ')}>
      <div className="relative">
        <motion.div
          aria-hidden="true"
          className="absolute -inset-8 rounded-full bg-orange-500/20 blur-2xl"
          animate={{ opacity: [0.55, 0.25, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 180deg, rgba(249,115,22,0.0), rgba(249,115,22,0.9), rgba(56,189,248,0.55), rgba(249,115,22,0.0))',
            filter: 'blur(0px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.15, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative grid h-14 w-14 place-items-center rounded-full border border-border bg-card shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <HardHat className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="mt-4 text-xs font-semibold text-muted">{label}</div>
    </div>
  )
}

