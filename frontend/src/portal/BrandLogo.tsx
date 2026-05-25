import logoMark from '../assets/rg-infra-mark.svg'
import logoFull from '../assets/rg-infra-logo.svg'

type BrandLogoProps = {
  variant?: 'mark' | 'full'
  className?: string
  imageClassName?: string
}

export function BrandLogo({ variant = 'mark', className = '', imageClassName = '' }: BrandLogoProps) {
  const src = variant === 'full' ? logoFull : logoMark
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      <img
        src={src}
        alt="R.G INFRA"
        className={`h-full w-full object-contain ${imageClassName}`}
        draggable={false}
      />
    </span>
  )
}
