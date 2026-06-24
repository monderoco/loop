import { useState } from 'react'
import { useOrganizer } from '../../context/OrganizerContext'
import { Mail, Fingerprint, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

export default function OrganizerLoginPage() {
  const { sendMagicLink, signInWithGoogle, error, clearError } = useOrganizer()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError('')
    clearError()
    setSending(true)
    try {
      await sendMagicLink(trimmed)
      setSent(true)
    } catch {
      // error is in context
    } finally {
      setSending(false)
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
        {/* Back link */}
        <a
          href="#/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            transition: 'color var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={14} /> Back to event
        </a>

        <div className="card card--elevated fade-in">
          {sent ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '4rem', height: '4rem', borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1.75rem',
                }}
              >
                <CheckCircle2 size={32} color="var(--accent-emerald)" />
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
                Check your email
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                We sent a magic link to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                Click it to sign in — no password needed.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Didn't get it?{' '}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSent(false); setSending(false) }}
                  style={{ display: 'inline', padding: '0', color: 'var(--text-accent)' }}
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            /* Email form */
            <>
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
                  Organizer sign in
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Enter your email and we'll send you a magic link. No password needed.
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
                  <label className="input-label" htmlFor="input-email">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute', left: '0.85rem',
                        top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-muted)', pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="input-email"
                      className="input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError('') }}
                      autoFocus
                      autoComplete="email"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                  {emailError && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }}>{emailError}</span>
                  )}
                </div>

                <button
                  id="btn-send-magic-link"
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={sending}
                >
                  {sending
                    ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Sending…</>
                    : <><Mail size={16} /> Send magic link</>
                  }
                </button>
                
                <div style={{ position: 'relative', textAlign: 'center', margin: '0.5rem 0' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderBottom: '1px solid var(--border)' }}></div>
                  <span style={{ position: 'relative', background: 'var(--bg-card)', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-lg btn-full"
                  onClick={async () => {
                    try {
                      await signInWithGoogle()
                    } catch {
                      // error handled by context
                    }
                  }}
                  disabled={sending}
                >
                  Sign in with Google
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
                Only authorised organisers can access event management.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
