import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'

type T = {
  quote: string
  name: string
  company: string
  city: string
}

const testimonials: T[] = [
  {
    quote:
      'Bajaj Developer Constructions delivered our office complex 2 weeks ahead of schedule. Exceptional quality.',
    name: 'Ramesh Gupta',
    company: 'TechPark Pvt Ltd',
    city: 'Pune',
  },
  {
    quote:
      'Transparent pricing, zero surprises. Highly recommended for industrial projects.',
    name: 'Anjali Sharma',
    company: 'Aurora Industries',
    city: 'Chennai',
  },
  {
    quote:
      "Our villa was built exactly as designed. The team's attention to detail is unmatched.",
    name: 'Vikram Nair',
    company: 'Private Client',
    city: 'Bangalore',
  },
  {
    quote:
      'Disciplined execution and great communication throughout. A reliable partner for commercial projects.',
    name: 'Siddharth Verma',
    company: 'CityMall Developers',
    city: 'Hyderabad',
  },
  {
    quote:
      'Site safety, quality checks, and progress tracking were top-notch. We felt in control at every step.',
    name: 'Neha Kulkarni',
    company: 'GreenBuild Group',
    city: 'Mumbai',
  },
]

function Stars() {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
      ))}
    </div>
  )
}

function useCardsPerView() {
  const [n, setN] = useState(3)
  useEffect(() => {
    const calc = () => setN(window.innerWidth < 768 ? 1 : 3)
    calc()
    window.addEventListener('resize', calc, { passive: true })
    return () => window.removeEventListener('resize', calc)
  }, [])
  return n
}

export function Testimonials() {
  const perView = useCardsPerView()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % testimonials.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [])

  const pages = useMemo(() => {
    const result: T[][] = []
    for (let i = 0; i < testimonials.length; i += perView) {
      result.push(testimonials.slice(i, i + perView))
    }
    return result
  }, [perView])

  const pageIndex = Math.floor(index / perView) % pages.length

  return (
    <section className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="TESTIMONIALS"
          title="What Our Clients Say"
          subtitle="Trusted by business owners and families alike—our reputation is built project by project."
        />

        <div className="mt-12 overflow-hidden">
          <motion.div
            animate={{ x: `-${pageIndex * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex"
          >
            {pages.map((group, i) => (
              <div
                key={i}
                className="grid w-full shrink-0 grid-cols-1 gap-6 md:grid-cols-3"
              >
                {group.map((t) => (
                  <motion.article
                    key={t.quote}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Stars />
                      <Quote className="h-6 w-6 text-orange-400/70" />
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-200/90">
                      “{t.quote}”
                    </p>
                    <div className="mt-6 border-t border-white/10 pt-4">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-white/65">
                        {t.company} • {t.city}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            ))}
          </motion.div>

          <div className="mt-8 flex items-center justify-center gap-2">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to testimonials ${i + 1}`}
                onClick={() => setIndex(i * perView)}
                className={[
                  'h-2.5 rounded-full transition',
                  i === pageIndex ? 'w-7 bg-orange-400' : 'w-2.5 bg-white/25 hover:bg-white/35',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

