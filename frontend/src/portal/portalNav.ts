import {
  Activity,
  Bell,
  Building2,
  BriefcaseBusiness,
  CreditCard,
  DatabaseBackup,
  HardHat,
  History,
  MessagesSquare,
  Settings,
} from 'lucide-react'

export type PortalNavItem = {
  label: string
  to: string
  Icon: typeof Building2
}

export const portalNav: PortalNavItem[] = [
  { label: 'Dashboard', to: '/portal/dashboard', Icon: Activity },
  { label: 'Properties', to: '/portal/projects', Icon: Building2 },
  { label: 'Clients', to: '/portal/clients', Icon: BriefcaseBusiness },
  { label: 'Work Projection', to: '/portal/work-projection', Icon: HardHat },
  { label: 'Due Reminders', to: '/portal/reminders', Icon: Bell },
  { label: 'Payments', to: '/portal/payments', Icon: CreditCard },
  { label: 'Communications', to: '/portal/communications', Icon: MessagesSquare },
  { label: 'Client History', to: '/portal/client-history', Icon: History },
  { label: 'Backup Data', to: '/portal/backup-data', Icon: DatabaseBackup },
  { label: 'Settings', to: '/portal/settings', Icon: Settings },
]
