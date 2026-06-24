import { useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { OrganizerProvider, useOrganizer } from './context/OrganizerContext'
import Header from './components/Header'
import EventPage from './pages/EventPage'
import OrganizerLoginPage from './pages/organizer/LoginPage'
import OrganizerSetupPage from './pages/organizer/SetupPage'
import DashboardPage from './pages/organizer/DashboardPage'
import EventFormPage from './pages/organizer/EventFormPage'
import ManageAttendeesPage from './pages/organizer/ManageAttendeesPage'
import LandingPage from './pages/LandingPage'
import type { Route } from './types'
import './index.css'
import { navigate } from './lib/router'

// ── History-based router ───────────────────────────────────────────────────

function parsePath(path: string): Route {
  path = path.replace(/^\/+/, '')

  // Organizer routes
  if (path === 'organizer' || path === 'organizer/login') return { page: 'organizer-login' }
  if (path === 'organizer/setup') return { page: 'organizer-setup' }
  if (path === 'organizer/dashboard') return { page: 'organizer-dashboard' }
  if (path === 'organizer/event/new') return { page: 'event-form' }

  const editMatch = path.match(/^organizer\/event\/([a-zA-Z0-9-]+)\/edit$/)
  if (editMatch) return { page: 'event-form', eventId: editMatch[1] }

  const manageMatch = path.match(/^organizer\/event\/([a-zA-Z0-9-]+)\/manage$/)
  if (manageMatch) return { page: 'manage-attendees', eventId: manageMatch[1] }

  // Guest event route
  const eventMatch = path.match(/^event\/([a-zA-Z0-9-]+)$/)
  if (eventMatch) return { page: 'event', eventId: eventMatch[1] }

  return { page: 'demo' }
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname))

  useEffect(() => {
    function onLocationChange() {
      setRoute(parsePath(window.location.pathname))
    }
    window.addEventListener('popstate', onLocationChange)
    return () => window.removeEventListener('popstate', onLocationChange)
  }, [])

  return route
}

// ── Organizer guard: redirect to setup if no profile ──────────────────────

function OrganizerGuard({ children, route }: { children: React.ReactNode; route: Route }) {
  const { organizer, isLoading, isAuthenticated } = useOrganizer()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: '1.75rem', height: '1.75rem', borderWidth: '3px' }} />
      </div>
    )
  }

  const isOrganizerRoute =
    route.page === 'organizer-login' ||
    route.page === 'organizer-setup' ||
    route.page === 'organizer-dashboard' ||
    route.page === 'event-form' ||
    route.page === 'manage-attendees'

  if (!isOrganizerRoute) return <>{children}</>

  // Needs auth: redirect to login
  if (!isAuthenticated && route.page !== 'organizer-login') {
    navigate('/organizer')
    return null
  }

  // Authenticated but no profile yet: redirect to setup
  if (isAuthenticated && !organizer && route.page !== 'organizer-setup') {
    navigate('/organizer/setup')
    return null
  }

  // Authenticated and has profile: redirect away from login to dashboard
  if (isAuthenticated && organizer && route.page === 'organizer-login') {
    navigate('/organizer/dashboard')
    return null
  }

  return <>{children}</>
}

// ── Router ────────────────────────────────────────────────────────────────

function Router() {
  const route = useRoute()

  // Organizer pages (no global header)
  if (
    route.page === 'organizer-login' ||
    route.page === 'organizer-setup' ||
    route.page === 'organizer-dashboard' ||
    route.page === 'event-form' ||
    route.page === 'manage-attendees'
  ) {
    return (
      <OrganizerGuard route={route}>
        {route.page === 'organizer-login' && <OrganizerLoginPage />}
        {route.page === 'organizer-setup' && <OrganizerSetupPage />}
        {route.page === 'organizer-dashboard' && <DashboardPage />}
        {route.page === 'event-form' && (
          <EventFormPage eventId={(route as { page: 'event-form'; eventId?: string }).eventId} />
        )}
        {route.page === 'manage-attendees' && (
          <ManageAttendeesPage
            eventId={(route as { page: 'manage-attendees'; eventId: string }).eventId}
          />
        )}
      </OrganizerGuard>
    )
  }

  // Guest / event pages
  if (route.page === 'demo') {
    return (
      <AuthProvider>
        <Header />
        <main>
          <LandingPage />
        </main>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <Header />
      <main>
        <EventPage eventId={route.eventId} />
      </main>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <OrganizerProvider>
      <Router />
    </OrganizerProvider>
  )
}
