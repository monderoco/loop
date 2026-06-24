import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Organizer } from '../types'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { getOrganizerProfile, upsertOrganizerProfile } from '../lib/db'

interface OrganizerContextType {
  organizer: Organizer | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Send magic link to email */
  sendMagicLink: (email: string) => Promise<void>
  /** Complete profile setup with name (first time) */
  setupProfile: (name: string) => Promise<void>
  /** Sign in using Google OAuth */
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
}

const OrganizerContext = createContext<OrganizerContextType | null>(null)

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On mount: check if there's an active Supabase auth session
  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && mounted) {
        setSession(session)
        const profile = await getOrganizerProfile()
        if (mounted) setOrganizer(profile)
      }
      if (mounted) setIsLoading(false)
    }

    init()

    // Listen for auth state changes (e.g. magic link callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSession(session)
        const profile = await getOrganizerProfile()
        setOrganizer(profile)
        setIsLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setOrganizer(null)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect back to the root, avoiding double-hash issues.
        // The app will parse the session and then they can enter the dashboard.
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    })
    if (error) {
      setError(error.message)
      throw error
    }
  }, [])

  const setupProfile = useCallback(async (name: string) => {
    setError(null)
    const profile = await upsertOrganizerProfile(name)
    if (!profile) {
      setError('Could not save your profile.')
      throw new Error('Profile save failed')
    }
    setOrganizer(profile)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    })
    if (error) {
      setError(error.message)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setOrganizer(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const isAuthenticated = session !== null

  return (
    <OrganizerContext.Provider
      value={{ organizer, isLoading, isAuthenticated, sendMagicLink, setupProfile, signInWithGoogle, signOut, error, clearError }}
    >
      {children}
    </OrganizerContext.Provider>
  )
}

export function useOrganizer() {
  const ctx = useContext(OrganizerContext)
  if (!ctx) throw new Error('useOrganizer must be used within OrganizerProvider')
  return ctx
}
