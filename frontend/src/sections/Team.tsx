import { motion } from 'framer-motion'
import { Link as LinkIcon } from 'lucide-react'
import { SectionHeading } from '../components/SectionHeading'

const members = [
  {
    name: 'Rajesh Sharma',
    role: 'Founder & CEO',
    exp: '20 yrs',
    city: 'Patna',
    image:
      'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Priya Mehta',
    role: 'Chief Architect',
    exp: '15 yrs',
    city: 'Mumbai',
    image:
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Anil Kumar',
    role: 'Project Director',
    exp: '12 yrs',
    city: 'Pune',
    image:
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Sunita Rao',
    role: 'Finance Head',
    exp: '10 yrs',
    city: 'Bangalore',
    image:
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=400&q=80',
  },
] as const

export function Team() {
  return (
    <section id="team" className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="TEAM"
          title="The People Behind Every Project"
          subtitle="Experienced leadership and hands-on execution—from planning to handover."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {members.map((m) => (
            <motion.article
              key={m.name}
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -7, scale: 1.01 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-transparent transition group-hover:bg-orange-400/90" />
              <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl opacity-0 transition group-hover:opacity-100" />

              <div className="flex items-start justify-between gap-4">
                <img
                  src={m.image}
                  alt={m.name}
                  className="h-14 w-14 rounded-2xl border border-white/10"
                  loading="lazy"
                />
                <a
                  href="#"
                  aria-label={`${m.name} profile link`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <LinkIcon className="h-5 w-5" />
                </a>
              </div>

              <h3 className="mt-5 font-heading text-lg font-extrabold text-white">
                {m.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-orange-200/90">
                {m.role}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white/70">
                <span>{m.exp} experience</span>
                <span className="text-white/45">•</span>
                <span>{m.city}</span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

