import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PortalAuthProvider } from './portal/auth'
import { initTheme } from './lib/theme'
import './index.css'
import App from './App.tsx'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PortalAuthProvider>
        <App />
      </PortalAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
