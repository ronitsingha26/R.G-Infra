import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'

type Category = 'All' | 'Residential' | 'Commercial' | 'Industrial' | 'Infrastructure'

type Project = {
  name: string
  location: string
  category: Exclude<Category, 'All'>
  status: 'Completed' | 'Ongoing'
  image: string
}

const tabs: Category[] = [
  'All',
  'Residential',
  'Commercial',
  'Industrial',
  'Infrastructure',
]

const projects: Project[] = [
  {
    name: 'Skyline Towers',
    location: 'Mumbai',
    category: 'Residential',
    status: 'Completed',
    image:
      'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'TechPark Hub',
    location: 'Pune',
    category: 'Commercial',
    status: 'Completed',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'NH-44 Highway Extension',
    location: 'Pan India',
    category: 'Infrastructure',
    status: 'Ongoing',
    image:
      'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'GreenVilla Apartments',
    location: 'Bangalore',
    category: 'Residential',
    status: 'Completed',
    image:
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Aurora Industrial Park',
    location: 'Chennai',
    category: 'Industrial',
    status: 'Completed',
    image:
      'https://images.unsplash.com/photo-1581093458791-9f3c3250f2c5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'City Mall Complex',
    location: 'Hyderabad',
    category: 'Commercial',
    status: 'Ongoing',
    image:
      'https://images.unsplash.com/photo-1481026469463-66327c86e544?auto=format&fit=crop&w=1200&q=80',
  },
]

export function ProjectsShowcase() {
  const [active, setActive] = useState<Category>('All')

  const filtered = useMemo(() => {
    if (active === 'All') return projects
    return projects.filter((p) => p.category === active)
  }, [active])

  return (
    <section id="projects" className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="PROJECTS"
          title="Our Work Speaks for Itself"
          subtitle="Explore a selection of projects delivered across India—crafted with quality, precision, and accountability."
        />

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((t) => {
            const isActive = t === active
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-orange-500 text-slate-950 shadow-[0_14px_50px_rgba(249,115,22,0.35)]'
                    : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
                ].join(' ')}
              >
                {t}
              </button>
            )
          })}
        </div>

        <motion.div
          layout
          className="mt-10 columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((p) => (
              <motion.article
                key={p.name}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="group relative mb-6 break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
              >
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur">
                    {p.category}
                  </span>
                  <span
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold backdrop-blur',
                      p.status === 'Completed'
                        ? 'border border-emerald-400/20 bg-emerald-500/15 text-emerald-200'
                        : 'border border-orange-400/20 bg-orange-500/15 text-orange-200',
                    ].join(' ')}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="relative">
                  <img
                    src={p.image}
                    alt={`${p.name} — ${p.location}`}
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1200'
                    }}
                    className="aspect-[4/3] h-full w-full bg-slate-900/70 object-cover transition duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-70 transition group-hover:opacity-90" />
                </div>

                <div className="absolute inset-0 flex items-end p-5">
                  <div className="w-full translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-heading text-lg font-extrabold text-white">
                          {p.name}
                        </h3>
                        <p className="mt-1 text-sm text-white/70">
                          {p.location}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
                      >
                        View Details <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}

