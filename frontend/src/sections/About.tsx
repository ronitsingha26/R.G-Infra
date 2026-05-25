import { CheckCircle2 } from 'lucide-react'
import { ScrollReveal } from '../components/ScrollReveal'

export function About() {
  return (
    <section id="about" className="relative overflow-hidden py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <ScrollReveal x={-18} className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-orange-400/30">
              <div className="absolute inset-0 ring-1 ring-white/10" />
              <img
                src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80"
                alt="Construction site"
                className="h-[520px] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>

            <div className="absolute -bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              Est. 2005
            </div>

            <div className="absolute -right-3 top-10 hidden h-16 w-16 rounded-2xl border border-orange-400/30 bg-orange-500/10 shadow-glow backdrop-blur lg:block" />
          </ScrollReveal>

          <div className="text-left">
            <ScrollReveal x={18} y={0}>
              <p className="text-xs font-bold tracking-[0.25em] text-orange-200/90">
                WHO WE ARE
              </p>
            </ScrollReveal>
            <ScrollReveal x={18} delay={0.05} y={0}>
              <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                20 Years of Building Excellence in India
              </h2>
            </ScrollReveal>
            <ScrollReveal x={18} delay={0.1} y={0}>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                R.G INFRA is a trusted name in residential, commercial,
                and infrastructure development. We combine engineering rigor,
                transparent planning, and disciplined execution to deliver
                quality projects—on schedule and within budget.
              </p>
            </ScrollReveal>

            <div className="mt-7 grid gap-3">
              {[
                'ISO Certified Construction Company',
                '200+ Completed Projects Pan India',
                'In-house Architecture & Design Team',
                'End-to-End Project Management',
              ].map((t, idx) => (
                <ScrollReveal key={t} delay={0.08 + idx * 0.04} x={18} y={0}>
                  <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-orange-400" />
                    <div className="text-sm font-semibold text-white/90">
                      {t}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.25} x={18} y={0}>
              <a
                href="#services"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-orange-300 transition hover:text-orange-200"
              >
                Learn More About Us <span aria-hidden="true">→</span>
              </a>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

