import { Calendar, ArrowRight } from 'lucide-react'
import { navigate } from '../lib/router'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div
        className="fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1))',
          padding: '4rem 2rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(139,92,246,0.2)',
          maxWidth: '600px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '50%', boxShadow: 'var(--shadow-glow)' }}>
            <Calendar size={32} color="var(--accent-purple)" />
          </div>
        </div>
        
        <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(160deg, #fff 40%, rgba(167,139,250,0.9) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome to Loop
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          The modern way to host events and keep your crew in the loop. No passwords, no hassle.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <a href="/organizer" onClick={(e) => { e.preventDefault(); navigate('/organizer') }} className="btn btn-primary btn-lg" style={{ width: '100%', maxWidth: '300px' }}>
            Host an event <ArrowRight size={16} />
          </a>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
            Guests join via direct invite link
          </div>
        </div>
      </div>
    </div>
  )
}
