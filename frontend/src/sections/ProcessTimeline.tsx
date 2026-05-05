import { motion } from 'framer-motion'
import { ClipboardCheck, FileSignature, PencilLine, Ruler, Shield } from 'lucide-react'
import { SectionHeading } from '../components/SectionHeading'

const steps = [
  {
    title: 'Consultation & Site Survey',
    desc: 'Requirements, feasibility, site measurements, and scope definition.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Design & Planning',
    desc: 'Architecture, structure, BOQ, timeline and execution plan.',
    Icon: Ruler,
  },
  {
    title: 'Contract & Permits',
    desc: 'Clear contract, approvals, documentation, and statutory compliance.',
    Icon: FileSignature,
  },
  {
    title: 'Construction & Monitoring',
    desc: 'On-site execution with quality checks and progress reporting.',
    Icon: Shield,
  },
  {
    title: 'Handover & Support',
    desc: 'Snag resolution, final handover, and post-completion support.',
    Icon: PencilLine,
  },
] as const

export function ProcessTimeline() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="PROCESS"
          title="How We Deliver Projects"
          subtitle="A structured, transparent workflow that keeps quality and timelines on track."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12 } },
          }}
          className="relative mt-14"
        >
          <div className="hidden items-center justify-between lg:flex">
            <div className="absolute left-10 right-10 top-7 border-t border-dashed border-orange-400/50" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {steps.map((s, idx) => (
              <motion.div
                key={s.title}
                variants={{
                  hidden: { opacity: 0, x: -18 },
                  show: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/10">
                    <span className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-extrabold text-slate-950">
                      {idx + 1}
                    </span>
                    <s.Icon className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="font-heading text-base font-extrabold text-white">
                    {s.title}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

