import { ScrollReveal } from './ScrollReveal'

export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = 'center',
}: {
  kicker?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}) {
  const alignClass = align === 'left' ? 'text-left items-start' : 'text-center items-center'

  return (
    <div className={`flex flex-col ${alignClass}`}>
      {kicker && (
        <ScrollReveal y={14}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-orange-200/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            {kicker}
          </div>
        </ScrollReveal>
      )}
      <ScrollReveal delay={0.05}>
        <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      {subtitle && (
        <ScrollReveal delay={0.1} y={14}>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {subtitle}
          </p>
        </ScrollReveal>
      )}
    </div>
  )
}

