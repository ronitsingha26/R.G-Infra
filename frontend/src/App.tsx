import { AnimatePresence, motion } from 'framer-motion'
import { lazy } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ScrollProgressBar } from './components/ScrollProgressBar'
import { SmoothScroll } from './components/SmoothScroll'
import { LoginPage } from './pages/LoginPage.tsx'
import { PortalLayout } from './portal/PortalLayout'
import { ProtectedPortal } from './portal/ProtectedPortal'

const DashboardPage = lazy(() => import('./portal/pages/DashboardPage.tsx').then(m => ({ default: m.DashboardPage })))
const ClientsPage = lazy(() => import('./portal/pages/ClientsPage.tsx').then(m => ({ default: m.ClientsPage })))
const ClientDetailPage = lazy(() => import('./portal/pages/ClientDetailPage.tsx').then(m => ({ default: m.ClientDetailPage })))
const ProjectsPage = lazy(() => import('./portal/pages/ProjectsPage.tsx').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./portal/pages/ProjectDetailPage.tsx').then(m => ({ default: m.ProjectDetailPage })))
const PaymentsPage = lazy(() => import('./portal/pages/PaymentsPage.tsx').then(m => ({ default: m.PaymentsPage })))

const SettingsPage = lazy(() => import('./portal/pages/SettingsPage.tsx').then(m => ({ default: m.SettingsPage })))
const CommunicationHistoryPage = lazy(() => import('./portal/pages/CommunicationHistoryPage.tsx').then(m => ({ default: m.CommunicationHistoryPage })))
const PaymentSchedulePage = lazy(() => import('./portal/pages/PaymentSchedulePage.tsx').then(m => ({ default: m.PaymentSchedulePage })))
const ReminderLogsPage = lazy(() => import('./portal/pages/ReminderLogsPage.tsx').then(m => ({ default: m.ReminderLogsPage })))
const ClientHistoryPage = lazy(() => import('./portal/pages/ClientHistoryPage.tsx').then(m => ({ default: m.ClientHistoryPage })))
const BackupDataPage = lazy(() => import('./portal/pages/BackupDataPage.tsx').then(m => ({ default: m.BackupDataPage })))
const WorkProjectionPage = lazy(() => import('./portal/pages/WorkProjectionPage.tsx').then(m => ({ default: m.WorkProjectionPage })))
const WorkProjectionClientPage = lazy(() => import('./portal/pages/WorkProjectionClientPage.tsx').then(m => ({ default: m.WorkProjectionClientPage })))

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                <SmoothScroll />
                <ScrollProgressBar />
                <LoginPage />
              </motion.div>
            }
          />
          <Route
            path="/login"
            element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                <SmoothScroll />
                <ScrollProgressBar />
                <LoginPage />
              </motion.div>
            }
          />

          <Route path="/portal" element={<ProtectedPortal />}>
            <Route element={<PortalLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/:id" element={<ClientDetailPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="communications" element={<CommunicationHistoryPage />} />
              <Route path="payment-schedule" element={<PaymentSchedulePage />} />
              <Route path="reminders" element={<ReminderLogsPage />} />
              <Route path="client-history" element={<ClientHistoryPage />} />
              <Route path="backup-data" element={<BackupDataPage />} />
              <Route path="work-projection" element={<WorkProjectionPage />} />
              <Route path="work-projection/:clientId" element={<WorkProjectionClientPage />} />

              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <div className="container-page py-24">
                <h1 className="font-heading text-4xl font-extrabold">Page not found</h1>
                <p className="mt-3 text-muted">The page you're looking for doesn't exist.</p>
              </div>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App
