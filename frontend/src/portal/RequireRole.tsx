import { Navigate, useLocation } from 'react-router-dom'
import { usePortalAuth, type PortalRole } from './auth'

export function RequireRole({
  roles,
  children,
}: {
  roles: PortalRole[]
  children: React.ReactNode
}) {
  const { user } = usePortalAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to="/portal/dashboard" replace state={{ deniedFrom: location.pathname }} />
  }
  return <>{children}</>
}

