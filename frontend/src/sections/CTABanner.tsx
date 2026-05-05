import { motion } from 'framer-motion'
import { Phone, Send } from 'lucide-react'
import { ScrollReveal } from '../components/ScrollReveal'

export function CTABanner() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        animate={{ backgroundPositionX: ['0%', '100%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 14px)',
          backgroundSize: '220px 220px',
        }}
      />

      <div className="container-page relative py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="text-left text-white">
            <ScrollReveal y={14}>
              <h3 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ready to Start Your Dream Project?
              </h3>
            </ScrollReveal>
            <ScrollReveal delay={0.06} y={14}>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                Get a free consultation and detailed quote within 24 hours.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.1} y={14} className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              href="tel:+919876543210"
              className="btn bg-white text-orange-600 shadow-[0_18px_60px_rgba(0,0,0,0.25)] hover:shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
            >
              <Phone className="h-4 w-4" />
              Call Us Now
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              href="#contact"
              className="btn btn-outline border-white/70 text-white hover:bg-white hover:text-orange-600"
            >
              <Send className="h-4 w-4" />
              Request a Quote
            </motion.a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

