import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { PasskeySession } from '../types'
import { getSession, setSession, clearSession, findAttendeeByCredentialId, createAttendee } from '../lib/db'
// passkey logic removed

interface AuthContextType {
  session: PasskeySession | null
  isLoading: boolean
  passkeySupported: boolean
  /** Try to auto-authenticate with a stored credential */
  tryAutoAuth: () => Promise<boolean>
  /** Register a new profile */
  register: (name: string) => Promise<void>
  /** Log in as an existing attendee */
  loginAs: (attendee: any) => Promise<void>
  signOut: () => void
  error: string | null
  clearError: () => void
  forceSetSession: (session: PasskeySession) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<PasskeySession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [passkeySupported, setPasskeySupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const tryAutoAuth = useCallback(async (): Promise<boolean> => {
    const stored = getSession()
    if (!stored) return false

    // Verify attendee still exists in DB (might have been deleted by organizer)
    const attendee = await findAttendeeByCredentialId(stored.credentialId)
    if (!attendee) {
      clearSession()
      setSessionState(null)
      return false
    }

    setSessionState(stored)
    return true
  }, [])

  useEffect(() => {
    tryAutoAuth().then(() => {
      setIsLoading(false)
    })
  }, [tryAutoAuth])

  const register = useCallback(async (name: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const credentialId = crypto.randomUUID()
      const publicKey = 'dummy_key'
      const attendee = await createAttendee(name, credentialId, publicKey)
      if (!attendee) throw new Error('Could not save your profile. Try again.')

      const newSession: PasskeySession = {
        attendeeId: attendee.id,
        name: attendee.name,
        credentialId,
      }
      setSession(newSession)
      setSessionState(newSession)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginAs = useCallback(async (attendee: any): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const newSession: PasskeySession = {
        attendeeId: attendee.id,
        name: attendee.name,
        credentialId: attendee.credential_id || crypto.randomUUID(),
      }
      setSession(newSession)
      setSessionState(newSession)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  const forceSetSession = useCallback((s: PasskeySession) => {
    setSession(s)
    setSessionState(s)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, isLoading, passkeySupported, tryAutoAuth, register, loginAs, signOut, error, clearError, forceSetSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
