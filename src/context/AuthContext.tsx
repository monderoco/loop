import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { PasskeySession } from '../types'
import { getSession, setSession, clearSession, findAttendeeByCredentialId, createAttendee } from '../lib/db'
import { registerPasskey, authenticatePasskey, isPlatformAuthenticatorAvailable } from '../lib/passkey'

interface AuthContextType {
  session: PasskeySession | null
  isLoading: boolean
  passkeySupported: boolean
  /** Try to auto-authenticate with a stored credential */
  tryAutoAuth: () => Promise<boolean>
  /** Register a new passkey with a name */
  register: (name: string) => Promise<void>
  /** Authenticate with passkey (known credential) */
  authenticate: () => Promise<boolean>
  signOut: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<PasskeySession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [passkeySupported, setPasskeySupported] = useState(false)
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
    isPlatformAuthenticatorAvailable().then(setPasskeySupported)
    tryAutoAuth().then(() => {
      setIsLoading(false)
    })
  }, [tryAutoAuth])

  const register = useCallback(async (name: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const { credentialId, publicKey } = await registerPasskey(name)
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

  const authenticate = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const stored = getSession()
      const { credentialId } = await authenticatePasskey(stored?.credentialId)
      const attendee = await findAttendeeByCredentialId(credentialId)
      if (!attendee) {
        setError('No account found for this passkey.')
        return false
      }

      const newSession: PasskeySession = {
        attendeeId: attendee.id,
        name: attendee.name,
        credentialId,
      }
      setSession(newSession)
      setSessionState(newSession)
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, isLoading, passkeySupported, tryAutoAuth, register, authenticate, signOut, error, clearError }}
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
