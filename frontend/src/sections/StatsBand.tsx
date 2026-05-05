import {
  Building,
  Clock3,
  MapPin,
  UsersRound,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useCountUpOnView } from '../hooks/useCountUpOnView'

function StatItem({
  icon: Icon,
  value,
  suffix,
  label,
  delayMs,
}: {
  icon: typeof Building
  value: number
  suffix?: string
  label: string
  delayMs: number
}) {
  const { ref, inView, display } = useCountUpOnView({
    value,
    durationMs: 950,
    delayMs,
    once: true,
  })

  return (
    <div ref={ref} className="flex flex-col items-center px-4 py-10">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
        <Icon className="h-6 w-6 text-orange-400" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-white"
      >
        {display}
        {suffix}
      </motion.div>
      <div className="mt-2 text-xs font-semibold tracking-wider text-white/70">
        {label}
      </div>
    </div>
  )
}

export function StatsBand() {
  return (
    <section className="relative overflow-hidden bg-[#0F172A]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="container-page relative">
        <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur md:grid md:grid-cols-4 md:divide-x md:divide-y-0">
          <StatItem
            icon={Building}
            value={200}
            suffix="+"
            label="Projects"
            delayMs={0}
          />
          <StatItem
            icon={Clock3}
            value={18}
            suffix="+"
            label="Years"
            delayMs={80}
          />
          <StatItem
            icon={UsersRound}
            value={500}
            suffix="+"
            label="Clients"
            delayMs={160}
          />
          <StatItem
            icon={MapPin}
            value={12}
            label="Cities"
            delayMs={240}
          />
        </div>
      </div>
    </section>
  )
}

