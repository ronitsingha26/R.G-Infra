import {
  BadgeCheck,
  ClipboardList,
  Clock,
  HardHat,
  Leaf,
  ShieldCheck,
  Star,
  Truck,
  UserCog,
  Webcam,
} from 'lucide-react'
import { SectionHeading } from '../components/SectionHeading'
import { ScrollReveal } from '../components/ScrollReveal'
import type { ComponentType } from 'react'

const left = [
  { Icon: Clock, text: 'On-Time Delivery Guarantee' },
  { Icon: ClipboardList, text: 'Transparent Cost Estimation' },
  { Icon: HardHat, text: 'Quality Material — Only Grade-A' },
  { Icon: UserCog, text: 'Dedicated Project Manager' },
  { Icon: BadgeCheck, text: 'Post-Completion Support' },
] as const

const right = [
  { Icon: Webcam, text: '24/7 Site Monitoring' },
  { Icon: ShieldCheck, text: 'Licensed & Insured' },
  { Icon: Truck, text: 'In-house Labor Force' },
  { Icon: Leaf, text: 'Green Building Certified' },
  { Icon: Star, text: '100% Client Satisfaction Rate' },
] as const

function Point({
  Icon,
  text,
  delay,
}: {
  Icon: ComponentType<{ className?: string }>
  text: string
  delay: number
}) {
  return (
    <ScrollReveal delay={delay} y={14} className="flex items-start gap-3">
      <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
        <Icon className="h-5 w-5 text-orange-400" />
      </div>
      <div className="text-sm font-semibold text-white/90">{text}</div>
    </ScrollReveal>
  )
}

export function WhyChooseUs() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="WHY CHOOSE US"
          title="Why Clients Trust R.G INFRA"
          subtitle="A blend of disciplined execution, clear communication, and quality-first engineering—trusted across residential, commercial and infrastructure projects."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:items-center">
          <div className="space-y-6">
            {left.map((p, i) => (
              <Point key={p.text} Icon={p.Icon} text={p.text} delay={i * 0.05} />
            ))}
          </div>

          <ScrollReveal className="relative mx-auto w-full max-w-md" y={18}>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80"
                alt="Construction quality"
                loading="lazy"
                className="h-[560px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            </div>
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-orange-500/10 blur-3xl" />
          </ScrollReveal>

          <div className="space-y-6">
            {right.map((p, i) => (
              <Point
                key={p.text}
                Icon={p.Icon}
                text={p.text}
                delay={i * 0.05}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

