import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useRef } from 'react'
import heroBg from '../assets/hero-bg.png'

export function Hero() {
  const heroRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '10%'])
  const fgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.55, 0])

  const lines = [
    { kind: 'kicker', text: 'Trusted Since 2005 • 200+ Projects Delivered' },
    { kind: 'title', text: 'Building Your Vision,\nBrick by Brick.' },
    {
      kind: 'body',
      text: 'Bajaj Developer Constructions delivers world-class residential, commercial, and industrial projects — on time, on budget, every time.',
    },
  ] as const

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative h-[100svh] min-h-[720px] overflow-hidden"
    >
      <div className="absolute inset-0">
        <motion.img
          src={heroBg}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          style={{ y: bgY, willChange: 'transform' }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <motion.div
          aria-hidden="true"
          className="absolute -left-28 -top-28 h-[420px] w-[420px] rounded-full bg-orange-500/25 blur-3xl"
          style={{ opacity: glowOpacity }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-sky-400/18 blur-3xl"
          style={{ y: fgY, willChange: 'transform' }}
        />
      </div>

      <div className="relative flex h-full items-stretch pt-16">
        <div className="container-page flex flex-1 items-center">
          <div className="max-w-2xl text-left">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
              }}
            >
              {lines.map((l) => (
                <motion.div
                  key={l.kind}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  {l.kind === 'kicker' && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      {l.text}
                    </div>
                  )}
                  {l.kind === 'title' && (
                    <h1 className="mt-6 whitespace-pre-line font-heading text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                      {l.text}
                    </h1>
                  )}
                  {l.kind === 'body' && (
                    <p className="mt-6 text-base leading-relaxed text-slate-200/90 sm:text-lg">
                      {l.text}
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                href="#projects"
                className="btn btn-primary group px-7"
              >
                View Our Projects
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </motion.a>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <a
                  href="#contact"
                  className="btn btn-outline px-7 border-white/25 bg-white/5 text-white/90 backdrop-blur hover:bg-white/10 hover:text-white"
                >
                  Get a Free Quote
                </a>
              </motion.div>
            </div>
          </div>
        </div>

        {/* scroll indicator */}
        <div className="pointer-events-none absolute inset-x-0 bottom-7 flex items-center justify-center">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 p-3 text-white/80 backdrop-blur"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>

      </div>
    </section>
  )
}

