import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { findAttendeesByName } from '../lib/db'
import type { Attendee } from '../types'
import { User, AlertCircle, Loader2, UserCheck, UserPlus, ChevronRight } from 'lucide-react'

interface PasskeyGateProps {
  onAuthenticated: () => void
}

type Step =
  | 'checking'         // auto-authenticating from stored session
  | 'name'             // asking for name
  | 'fuzzy-match'      // found similar names — "Is this you?"

export default function PasskeyGate({ onAuthenticated }: PasskeyGateProps) {
  const { session, register, loginAs, error, clearError, isLoading } = useAuth()
  const [step, setStep] = useState<Step>('checking')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [similarAttendees, setSimilarAttendees] = useState<Attendee[]>([])
  const [searchingNames, setSearchingNames] = useState(false)

  useEffect(() => {
    if (session) {
      onAuthenticated()
      return
    }
    const stored = localStorage.getItem('rsvp_session')
    if (stored) {
      // already authed, should have been handled by tryAutoAuth
      onAuthenticated()
    } else {
      setStep('name')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Called when user submits their name — look for similar people first */
  async function handleSubmitName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Please enter your name'); return }
    if (trimmed.length < 2) { setNameError('Name must be at least 2 characters'); return }
    setNameError('')
    clearError()

    setSearchingNames(true)
    const similar = await findAttendeesByName(trimmed)
    setSearchingNames(false)

    if (similar.length > 0) {
      setSimilarAttendees(similar)
      setStep('fuzzy-match')
    } else {
      await doRegister(trimmed)
    }
  }

  /** User confirmed they ARE one of the similar people */
  async function handleClaimIdentity(attendee: Attendee) {
    clearError()
    await loginAs(attendee)
    onAuthenticated()
  }

  /** User says they are NOT any of the listed people — create new */
  async function handleNotMe() {
    clearError()
    await doRegister(name.trim())
  }

  async function doRegister(displayName: string) {
    clearError()
    try {
      await register(displayName)
      onAuthenticated()
    } catch {
      setStep('name')
    }
  }

  // ── Checking / auto-auth ──────────────────────────────────
  if (step === 'checking') {
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="modal__icon">
            <User size={32} color="var(--accent-purple)" />
          </div>
          <h2 className="modal__title">One moment…</h2>
          <p className="modal__sub">Verifying your identity.</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <div className="spinner" />
          </div>
        </div>
      </div>
    )
  }

  // ── Fuzzy match — "Is this you?" ──────────────────────────
  if (step === 'fuzzy-match') {
    return (
      <div className="modal-backdrop">
        <div className="modal fade-in">
          <div className="modal__icon">
            <UserCheck size={28} color="var(--accent-purple)" />
          </div>
          <h2 className="modal__title">Is this you?</h2>
          <p className="modal__sub">
            We found {similarAttendees.length === 1 ? 'a name' : 'some names'} that look similar to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"{name}"</strong>.
            Select yourself to continue.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {similarAttendees.map(attendee => (
              <button
                key={attendee.id}
                className="fuzzy-match-option"
                onClick={() => handleClaimIdentity(attendee)}
                id={`fuzzy-option-${attendee.id}`}
              >
                <div className="avatar" style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.8rem', flexShrink: 0 }}>
                  {attendee.name.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: '0.95rem' }}>
                  {attendee.name}
                </span>
                <ChevronRight size={15} color="var(--text-muted)" />
              </button>
            ))}
          </div>

          <button
            id="btn-not-me"
            className="btn btn-secondary btn-full"
            onClick={handleNotMe}
            disabled={isLoading}
          >
            <UserPlus size={15} />
            None of these — I'm new
          </button>
        </div>
      </div>
    )
  }

  // ── Name entry (default / step === 'name') ────────────────
  return (
    <div className="modal-backdrop">
      <div className="modal fade-in">
        <div className="modal__icon">
          <User size={28} color="var(--accent-purple)" />
        </div>
        <h2 className="modal__title">Who are you?</h2>
        <p className="modal__sub">
          Enter your name to continue to the event details.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitName} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="input-name">Your name</label>
            <input
              id="input-name"
              className="input"
              type="text"
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              autoFocus
              autoComplete="name"
              maxLength={60}
            />
            {nameError && (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }}>{nameError}</span>
            )}
          </div>

          <button
            id="btn-continue-passkey"
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={isLoading || searchingNames}
          >
            {searchingNames || isLoading
              ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Checking…</>
              : <>Continue</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
          Your session stays on this device.
        </p>
      </div>
    </div>
  )
}
