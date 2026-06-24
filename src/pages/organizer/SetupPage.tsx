import { useState } from 'react'
import { useOrganizer } from '../../context/OrganizerContext'
import { User, AlertCircle, Loader2, Fingerprint } from 'lucide-react'

/** Shown to organizers who have authenticated but haven't set up their profile name yet */
export default function OrganizerSetupPage() {
  const { setupProfile, error, clearError, signOut } = useOrganizer()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 2) {
      setNameError('Please enter your name (at least 2 characters)')
      return
    }
    setNameError('')
    clearError()
    setSaving(true)
    try {
      await setupProfile(trimmed)
      // OrganizerContext will update organizer state; App will route to dashboard
    } catch {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div className="card card--elevated fade-in">
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))',
                border: '1px solid rgba(139,92,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Fingerprint size={26} color="var(--accent-purple)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              Welcome, organiser!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              You're signed in. What should we call you?
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="input-organizer-name">Your name</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute', left: '0.85rem',
                    top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', pointerEvents: 'none',
                  }}
                />
                <input
                  id="input-organizer-name"
                  className="input"
                  type="text"
                  placeholder="e.g. Sarah Kim"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError('') }}
                  autoFocus
                  autoComplete="name"
                  maxLength={60}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              {nameError && (
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }}>{nameError}</span>
              )}
            </div>

            <button
              id="btn-save-organizer-name"
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={saving}
            >
              {saving
                ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
                : 'Continue to dashboard'
              }
            </button>
          </form>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => signOut()}
            style={{ width: '100%', marginTop: '0.75rem', color: 'var(--text-muted)' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
