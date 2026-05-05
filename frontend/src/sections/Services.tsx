import {
  Building2,
  Factory,
  Home,
  Landmark,
  PencilRuler,
  Wrench,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SectionHeading } from '../components/SectionHeading'

const services = [
  {
    title: 'Residential Construction',
    desc: 'Bungalows, apartments, villas — built to last.',
    Icon: Home,
  },
  {
    title: 'Commercial Buildings',
    desc: 'Offices, malls, showrooms designed for scale.',
    Icon: Building2,
  },
  {
    title: 'Industrial Projects',
    desc: 'Warehouses, factories, plants — heavy-duty construction.',
    Icon: Factory,
  },
  {
    title: 'Infrastructure',
    desc: 'Roads, bridges, drainage — public works expertise.',
    Icon: Landmark,
  },
  {
    title: 'Renovation & Interiors',
    desc: 'Transforming existing spaces with modern design.',
    Icon: Wrench,
  },
  {
    title: 'Architecture & Planning',
    desc: 'In-house architects for complete design solutions.',
    Icon: PencilRuler,
  },
] as const

export function Services() {
  return (
    <section id="services" className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="SERVICES"
          title="Our Core Services"
          subtitle="From foundation to finish — we handle it all."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((s) => (
            <motion.div
              key={s.title}
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)] transition"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-transparent transition group-hover:bg-orange-400/90" />
              <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl opacity-0 transition group-hover:opacity-100" />

              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/10">
                  <s.Icon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-extrabold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {s.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

