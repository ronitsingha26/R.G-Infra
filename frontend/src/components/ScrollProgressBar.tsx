import { motion, useScroll } from 'framer-motion'

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-orange-400/90"
      style={{ scaleX: scrollYProgress, willChange: 'transform' }}
    />
  )
}

