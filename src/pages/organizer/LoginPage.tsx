import { useOrganizer } from '../../context/OrganizerContext'
import { Fingerprint, AlertCircle, ArrowLeft } from 'lucide-react'
import { navigate } from '../../lib/router'

export default function OrganizerLoginPage() {
  const { signInWithGoogle, error } = useOrganizer()

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
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/') }}
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
          {/* Email form */}
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
                Sign in with your Google account to manage your events.
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg btn-full"
                onClick={async () => {
                  try {
                    await signInWithGoogle()
                  } catch {
                    // error handled by context
                  }
                }}
              >
                Sign in with Google
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
              Only authorised organisers can access event management.
            </p>
          </>
        </div>
      </div>
    </div>
  )
}
