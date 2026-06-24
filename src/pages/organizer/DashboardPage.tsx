import { useState, useEffect, useCallback } from 'react'
import { useOrganizer } from '../../context/OrganizerContext'
import { getOrganizerEvents, deleteEvent } from '../../lib/db'
import type { Event } from '../../types'
import { format } from 'date-fns'
import {
  Plus, Calendar, MapPin, Users, Edit3, Trash2,
  ExternalLink, LogOut, Loader2, AlertCircle, Link2, Check, Settings, X
} from 'lucide-react'
import { navigate } from '../../lib/router'

export default function DashboardPage() {
  const { organizer, signOut, setupProfile } = useOrganizer()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const data = await getOrganizerEvents()
    setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function handleDelete(event: Event) {
    if (!confirm(`Delete "${event.title}"? This will remove all RSVPs too.`)) return
    setDeletingId(event.id)
    const ok = await deleteEvent(event.id)
    if (ok) {
      setEvents(prev => prev.filter(e => e.id !== event.id))
    } else {
      setError('Failed to delete event.')
    }
    setDeletingId(null)
  }

  const upcoming = events.filter(e => new Date(e.event_date) >= new Date())
  const past = events.filter(e => new Date(e.event_date) < new Date())

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Organizer top bar */}
      <div
        style={{
          background: 'rgba(139,92,246,0.08)',
          borderBottom: '1px solid rgba(139,92,246,0.2)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            className="avatar"
            style={{
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
              width: '2rem', height: '2rem', fontSize: '0.75rem',
            }}
          >
            {organizer?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {organizer?.name}
            </span>
            <span
              className="badge badge-decor"
              style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}
            >
              Organiser
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSettings(true)}
            title="Profile Settings"
          >
            <Settings size={13} />
            Settings
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => { await signOut(); navigate('/organizer'); }}
            id="btn-organizer-signout"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>

      {showSettings && organizer && (
        <SettingsModal 
          currentName={organizer.name} 
          onClose={() => setShowSettings(false)} 
          onSave={setupProfile} 
        />
      )}

      <div className="container container--wide" style={{ padding: '2rem 1.25rem 4rem' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                marginBottom: '0.25rem',
              }}
            >
              Your Events
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {events.length} event{events.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            id="btn-create-event"
            className="btn btn-primary"
            onClick={() => navigate('/organizer/event/new')}
          >
            <Plus size={15} />
            New event
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div className="spinner" />
            <span style={{ fontSize: '0.9rem' }}>Loading events…</span>
          </div>
        ) : events.length === 0 ? (
          /* Empty state */
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              borderStyle: 'dashed',
              borderColor: 'rgba(139,92,246,0.25)',
              background: 'rgba(139,92,246,0.04)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No events yet</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '300px', margin: '0 auto 1.5rem' }}>
              Create your first event and share the link with guests.
            </p>
            <button
              id="btn-create-first-event"
              className="btn btn-primary"
              onClick={() => navigate('/organizer/event/new')}
            >
              <Plus size={15} /> Create event
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {upcoming.length > 0 && (
              <section>
                <p className="section-heading">Upcoming · {upcoming.length}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {upcoming.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => navigate(`/organizer/event/${event.id}/edit`)}
                      onManage={() => navigate(`/organizer/event/${event.id}/manage`)}
                      onDelete={() => handleDelete(event)}
                      deleting={deletingId === event.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <p className="section-heading">Past · {past.length}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {past.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => navigate(`/organizer/event/${event.id}/edit`)}
                      onManage={() => navigate(`/organizer/event/${event.id}/manage`)}
                      onDelete={() => handleDelete(event)}
                      deleting={deletingId === event.id}
                      isPast
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({
  event, onEdit, onManage, onDelete, deleting, isPast,
}: {
  event: Event
  onEdit: () => void
  onManage: () => void
  onDelete: () => void
  deleting?: boolean
  isPast?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const date = new Date(event.event_date)

  function copyShareLink() {
    const urlId = event.slug || event.id
    const url = `${window.location.origin}${window.location.pathname}#/event/${urlId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        gap: '1.25rem',
        alignItems: 'flex-start',
        opacity: isPast ? 0.75 : 1,
        transition: 'opacity var(--transition)',
        flexWrap: 'wrap',
      }}
    >
      {/* Date block */}
      <div
        style={{
          flexShrink: 0,
          width: '3.5rem',
          textAlign: 'center',
          padding: '0.5rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {format(date, 'MMM')}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
          {format(date, 'd')}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem', fontFamily: 'var(--font-display)' }}>
          {event.title}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={12} /> {format(date, 'h:mm a')}
          </span>
          {event.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={12} /> {event.location}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={copyShareLink}
          title={copied ? 'Link copied!' : 'Copy share link'}
          id={`btn-share-event-${event.id}`}
          style={copied ? { color: 'var(--accent-emerald)', borderColor: 'rgba(16,185,129,0.4)' } : {}}
        >
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
        <a
          href={`#/event/${event.slug || event.id}`}
          className="btn btn-ghost btn-sm"
          title="View guest page"
          id={`btn-view-event-${event.id}`}
        >
          <ExternalLink size={13} />
        </a>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onManage}
          title="Manage attendees"
          id={`btn-manage-event-${event.id}`}
        >
          <Users size={13} />
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onEdit}
          title="Edit event"
          id={`btn-edit-event-${event.id}`}
        >
          <Edit3 size={13} />
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={onDelete}
          disabled={deleting}
          title="Delete event"
          id={`btn-delete-event-${event.id}`}
        >
          {deleting ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  )
}

function SettingsModal({ 
  currentName, 
  onClose, 
  onSave 
}: { 
  currentName: string; 
  onClose: () => void; 
  onSave: (name: string) => Promise<void> 
}) {
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim())
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Profile Settings</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '1.25rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="input-label" htmlFor="org-name">Your Name</label>
            <input
              id="org-name"
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah"
              autoFocus
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
