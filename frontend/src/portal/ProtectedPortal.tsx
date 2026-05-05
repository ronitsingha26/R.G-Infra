import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePortalAuth } from './auth'

export function ProtectedPortal() {
  const { user, loading } = usePortalAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
