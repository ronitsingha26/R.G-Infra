import {
  Activity,
  BriefcaseBusiness,
  CreditCard,
  HardHat,
  Settings,
} from 'lucide-react'

export type PortalNavItem = {
  label: string
  to: string
  Icon: typeof HardHat
}

export const portalNav: PortalNavItem[] = [
  { label: 'Dashboard', to: '/portal/dashboard', Icon: Activity },
  { label: 'Clients', to: '/portal/clients', Icon: BriefcaseBusiness },
  { label: 'Projects', to: '/portal/projects', Icon: HardHat },
  { label: 'Payments', to: '/portal/payments', Icon: CreditCard },

  { label: 'Settings', to: '/portal/settings', Icon: Settings },
]
