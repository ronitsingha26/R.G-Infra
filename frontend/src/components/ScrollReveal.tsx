import { motion, type MotionProps } from 'framer-motion'
import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  className?: string
  delay?: number
  y?: number
  x?: number
  once?: boolean
  viewportAmount?: number
}> &
  MotionProps

export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 18,
  x = 0,
  once = true,
  viewportAmount = 0.25,
  ...motionProps
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, amount: viewportAmount }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

