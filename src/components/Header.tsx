import { useAuth } from '../context/AuthContext'
import { Fingerprint, LogOut, Settings } from 'lucide-react'
import LoopIcon from '../assets/loop-icon.svg'

export default function Header() {
  const { session, signOut } = useAuth()

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <a href="#/" className="app-header__logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <img src={LoopIcon} alt="Loop Icon" style={{ width: '1.2rem', height: '1.2rem' }} />
          Loop
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {session ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.75rem' }}>
                  {session.name.slice(0, 2).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.name}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={signOut}
                title="Sign out"
                id="btn-sign-out"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                <Fingerprint size={13} />
                <span>Passkey secured</span>
              </div>
              <a
                href="#/organizer"
                className="btn btn-ghost btn-sm"
                title="Organiser sign in"
                id="btn-organizer-link"
                style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}
              >
                <Settings size={13} />
                Organiser
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
