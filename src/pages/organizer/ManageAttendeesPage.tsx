import { useState, useEffect, useCallback } from 'react'
import { getEvent, getEventRSVPs, updateAttendeeName, deleteAttendee, deleteRSVP } from '../../lib/db'
import type { Event, RSVP } from '../../types'
import { format } from 'date-fns'
import {
  ArrowLeft, Users, Palette, Clock,
  Pencil, Trash2, Check, X, Loader2, AlertCircle,
  CheckCircle2, HelpCircle, XCircle, ExternalLink
} from 'lucide-react'

function navigate(hash: string) { window.location.hash = hash }

interface ManageAttendeesPageProps {
  eventId: string
}

type Filter = 'all' | 'going' | 'maybe' | 'not_going'

const STATUS_ICON = {
  going: <CheckCircle2 size={13} color="#10b981" />,
  maybe: <HelpCircle size={13} color="#f59e0b" />,
  not_going: <XCircle size={13} color="#f43f5e" />,
}

const STATUS_LABEL: Record<string, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: "Can't go",
}

export default function ManageAttendeesPage({ eventId }: ManageAttendeesPageProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)  // attendee id being edited
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [ev, rv] = await Promise.all([getEvent(eventId), getEventRSVPs(eventId)])
    setEvent(ev)
    setRsvps(rv)
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function handleSaveName(rsvp: RSVP) {
    if (!editName.trim()) return
    setSavingId(rsvp.attendee_id)
    const ok = await updateAttendeeName(rsvp.attendee_id, editName.trim())
    if (ok) {
      setRsvps(prev =>
        prev.map(r =>
          r.attendee_id === rsvp.attendee_id
            ? { ...r, attendee: r.attendee ? { ...r.attendee, name: editName.trim() } : r.attendee }
            : r
        )
      )
      setEditingId(null)
    } else {
      setError('Failed to update name.')
    }
    setSavingId(null)
  }

  async function handleDeleteRSVP(rsvp: RSVP) {
    if (!confirm(`Remove "${rsvp.attendee?.name}"'s RSVP?`)) return
    setDeletingId(rsvp.id)
    const ok = await deleteRSVP(rsvp.id)
    if (ok) {
      setRsvps(prev => prev.filter(r => r.id !== rsvp.id))
    } else {
      setError('Failed to remove RSVP.')
    }
    setDeletingId(null)
  }

  async function handleDeleteAttendee(rsvp: RSVP) {
    if (!confirm(`Fully remove "${rsvp.attendee?.name}" and all their RSVPs across all events?`)) return
    setDeletingId(rsvp.id)
    const ok = await deleteAttendee(rsvp.attendee_id)
    if (ok) {
      setRsvps(prev => prev.filter(r => r.attendee_id !== rsvp.attendee_id))
    } else {
      setError('Failed to remove attendee.')
    }
    setDeletingId(null)
  }

  const filtered = rsvps.filter(r => filter === 'all' || r.status === filter)
  const going = rsvps.filter(r => r.status === 'going').length
  const maybe = rsvps.filter(r => r.status === 'maybe').length
  const notGoing = rsvps.filter(r => r.status === 'not_going').length
  const food = rsvps.filter(r => r.food_pledge).length
  const decor = rsvps.filter(r => r.helping_with_decor).length
  const late = rsvps.filter(r => r.is_late).length

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <div className="spinner" /> <span>Loading attendees…</span>
      </div>
    )
  }

  return (
    <div className="container container--wide" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/organizer/dashboard')}
        style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}
        id="btn-back-from-manage"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
            }}
          >
            {event?.title ?? 'Event'}
          </h1>
          <a
            href={`#/event/${eventId}`}
            className="btn btn-ghost btn-sm"
            title="View guest page"
            id="btn-view-guest-page"
          >
            <ExternalLink size={13} /> Guest view
          </a>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/organizer/event/${eventId}/edit`)}
            id="btn-edit-event-from-manage"
          >
            Edit event
          </button>
        </div>
        {event && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            {event.location && ` · ${event.location}`}
          </p>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)} style={{ marginLeft: 'auto', padding: '0 0.25rem' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-bar" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[
          { label: 'Total', value: rsvps.length, color: 'var(--text-primary)' },
          { label: 'Going', value: going, color: 'var(--accent-emerald)' },
          { label: 'Maybe', value: maybe, color: 'var(--accent-amber)' },
          { label: "Can't go", value: notGoing, color: 'var(--accent-rose)' },
          { label: 'Food', value: food, color: '#fdba74' },
          { label: 'Decor', value: decor, color: 'var(--text-accent)' },
        ].map(s => (
          <div key={s.label} className="stat-cell">
            <div className="stat-number" style={{ color: s.color, fontSize: '1.4rem' }}>{s.value}</div>
            <div className="stat-cell__label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        {([
          ['all', `All (${rsvps.length})`],
          ['going', `Going (${going})`],
          ['maybe', `Maybe (${maybe})`],
          ['not_going', `Can't go (${notGoing})`],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            className={`tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            id={`filter-tab-${f}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Attendee table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p>No attendees in this category.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Status', 'Food pledge', 'Extras', 'Actions'].map(col => (
                  <th
                    key={col}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rsvp, i) => {
                const isEditing = editingId === rsvp.attendee_id
                const isDeleting = deletingId === rsvp.id
                const isSaving = savingId === rsvp.attendee_id

                return (
                  <tr
                    key={rsvp.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isEditing ? 'rgba(139,92,246,0.05)' : undefined,
                      opacity: isDeleting ? 0.5 : 1,
                      transition: 'opacity var(--transition), background var(--transition)',
                    }}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input
                            className="input"
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.88rem' }}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveName(rsvp)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                          <button
                            className="btn btn-going btn-sm active"
                            onClick={() => handleSaveName(rsvp)}
                            disabled={isSaving}
                            id={`btn-save-name-${rsvp.attendee_id}`}
                          >
                            {isSaving ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={12} />}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingId(null)}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div className="avatar" style={{ width: '1.9rem', height: '1.9rem', fontSize: '0.7rem' }}>
                            {(rsvp.attendee?.name || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {rsvp.attendee?.name || '—'}
                            </span>
                            {rsvp.contact_number && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {rsvp.contact_number}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        className={`badge badge-${rsvp.status === 'not_going' ? 'not-going' : rsvp.status}`}
                        style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}
                      >
                        {STATUS_ICON[rsvp.status]}
                        {STATUS_LABEL[rsvp.status]}
                      </span>
                    </td>

                    {/* Food */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {rsvp.food_pledge ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {rsvp.food_pledge}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Extras (decor, late) */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {rsvp.helping_with_decor && (
                          <span className="badge badge-decor" title="Helping with decor">
                            <Palette size={10} /> Decor
                          </span>
                        )}
                        {rsvp.is_late && (
                          <span className="badge badge-late" title={rsvp.late_note || 'Late'}>
                            <Clock size={10} /> Late
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {!isEditing && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Edit name"
                            onClick={() => {
                              setEditingId(rsvp.attendee_id)
                              setEditName(rsvp.attendee?.name || '')
                            }}
                            id={`btn-edit-name-${rsvp.attendee_id}`}
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          title="Remove RSVP (keeps attendee)"
                          onClick={() => handleDeleteRSVP(rsvp)}
                          disabled={isDeleting}
                          id={`btn-delete-rsvp-${rsvp.id}`}
                        >
                          {isDeleting ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Trash2 size={12} />}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Remove attendee entirely (all events)"
                          onClick={() => handleDeleteAttendee(rsvp)}
                          disabled={isDeleting}
                          id={`btn-delete-attendee-${rsvp.attendee_id}`}
                          style={{ opacity: 0.7 }}
                        >
                          <Users size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Late arrival notes */}
      {late > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Clock size={14} color="var(--accent-indigo)" />
            <p className="section-heading" style={{ margin: 0 }}>Late arrival notes</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rsvps.filter(r => r.is_late && r.late_note).map(r => (
              <div key={r.id} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{r.attendee?.name}</strong>
                {': '}
                {r.late_note}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
