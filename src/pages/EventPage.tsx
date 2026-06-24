import { useState, useEffect, useCallback } from 'react'
import type { Event, RSVP } from '../types'
import { supabase } from '../lib/supabase'
import { getEventRSVPs } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { MapPin, Calendar, Clock, Users, UtensilsCrossed, Palette, Gamepad2, X } from 'lucide-react'
import Markdown from '../components/Markdown'
import RSVPForm from '../components/RSVPForm'
import AttendeeList from '../components/AttendeeList'
import PasskeyGate from '../components/PasskeyGate'

interface EventPageProps {
  eventId: string
}

export default function EventPage({ eventId }: EventPageProps) {
  const { session } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(!!session)
  const [showGate, setShowGate] = useState(false)
  const [activeModal, setActiveModal] = useState<'going' | 'food' | 'decor' | 'activity' | null>(null)

  const loadEvent = useCallback(async () => {
    // If eventId looks like a UUID, match by id or slug. Otherwise, match by slug.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
    const query = supabase.from('loop_events').select('*');
    const { data } = await (isUuid 
      ? query.eq('id', eventId).single() 
      : query.eq('slug', eventId).single());

    if (data) {
      setEvent(data)
    }
    setLoading(false)
  }, [eventId])

  const loadRSVPs = useCallback(async () => {
    if (!event?.id) return;
    const all = await getEventRSVPs(event.id)
    setRsvps(all)
  }, [event?.id])

  useEffect(() => { loadEvent() }, [loadEvent])
  useEffect(() => { loadRSVPs() }, [loadRSVPs])

  const going = rsvps.filter(r => r.status === 'going').reduce((sum, r) => sum + 1 + (r.plus_ones || 0), 0)
  const maybe = rsvps.filter(r => r.status === 'maybe').length
  const decorCount = rsvps.filter(r => r.helping_with_decor).length
  const foodCount = rsvps.reduce((sum, r) => sum + (r.food_pledge ? r.food_pledge.split(',').filter(x => x.trim()).length : 0), 0)
  const activityCount = rsvps.reduce((sum, r) => sum + (r.host_activity ? r.host_activity.split(',').filter(x => x.trim()).length : 0), 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" style={{ width: '1.75rem', height: '1.75rem', borderWidth: '3px' }} />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Event not found.</p>
      </div>
    )
  }

  const eventDate = new Date(event.event_date)

  return (
    <>
      {/* Passkey gate modal */}
      {showGate && !authed && (
        <PasskeyGate
          onAuthenticated={() => {
            setAuthed(true)
            setShowGate(false)
          }}
        />
      )}

      {!authed && event.status !== 'cancelled' ? (
        <div className="invite-wrapper fade-in">
          <div className="invite-card">
            <span style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              ✨ You're Invited
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
              {event.title}
            </h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                <Calendar size={18} color="var(--accent-cyan)" />
                {format(eventDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                <Clock size={18} color="var(--accent-purple)" />
                {format(eventDate, 'h:mm a')}
              </div>
              {event.location && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                  <MapPin size={18} color="var(--accent-emerald)" />
                  {event.location}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-lg btn-rsvp-pulse"
              style={{ width: '100%' }}
              onClick={() => setShowGate(true)}
            >
              Open Invitation & RSVP
            </button>
          </div>
        </div>
      ) : (
        <div className="container" style={{ padding: '0 1.25rem 4rem' }}>

        {/* ── Event Hero ── */}
        <section className="event-hero fade-in">
          <div className="event-hero__eyebrow">
            <span className="glow-pill">
              <Calendar size={12} />
              {format(eventDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <h1 className="event-hero__title">{event.title}</h1>

          <div className="event-hero__meta">
            <div className="event-hero__meta-item">
              <Clock size={15} color="var(--accent-purple)" />
              {format(eventDate, 'h:mm a')}
            </div>
            <div className="event-hero__meta-item">
              <MapPin size={15} color="var(--accent-cyan)" />
              {event.location ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '4px' }}
                >
                  {event.location}
                </a>
              ) : 'TBD'}
            </div>
            <div className="event-hero__meta-item">
              <Users size={15} color="var(--accent-emerald)" />
              {going} going{maybe > 0 ? `, ${maybe} maybe` : ''}
            </div>
          </div>
        </section>

        {event.status === 'cancelled' && (
          <div className="card fade-in" style={{ background: 'var(--surface-sunken)', border: '1px solid #fecaca', marginBottom: '2rem' }}>
            <h2 style={{ color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ This Event Has Been Cancelled
            </h2>
            <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d' }}>The organizer has cancelled this event.</p>
          </div>
        )}

        {/* ── Stats bar ── */}
        {rsvps.length > 0 && (
          <div className="stats-bar fade-in fade-in--delay-1" style={{ marginBottom: '2rem' }}>
            <button className="stat-cell stat-btn" onClick={() => setActiveModal('going')}>
              <div className="stat-number" style={{ color: 'var(--accent-emerald)' }}>{going}</div>
              <div className="stat-cell__label">Going</div>
            </button>
            {foodCount > 0 && (
              <button className="stat-cell stat-btn" onClick={() => setActiveModal('food')}>
                <div className="stat-number" style={{ color: '#fdba74' }}>{foodCount}</div>
                <div className="stat-cell__label">Food pledges</div>
              </button>
            )}
            {decorCount > 0 && (
              <button className="stat-cell stat-btn" onClick={() => setActiveModal('decor')}>
                <div className="stat-number" style={{ color: 'var(--text-accent)' }}>{decorCount}</div>
                <div className="stat-cell__label">Decor helpers</div>
              </button>
            )}
            {activityCount > 0 && (
              <button className="stat-cell stat-btn" onClick={() => setActiveModal('activity')}>
                <div className="stat-number" style={{ color: 'var(--accent-amber)' }}>{activityCount}</div>
                <div className="stat-cell__label">Activities</div>
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Description card */}
          <div className="card fade-in">
            <Markdown content={event.description} />
          </div>

          {/* Contacts card */}
          {event.contacts && event.contacts.length > 0 && (
            <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-sunken)' }}>
              <p className="section-heading" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={15} color="var(--accent-cyan)" />
                Hosted by
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {event.contacts.map((contact, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{contact.name}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {contact.email && <div><a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{contact.email}</a></div>}
                      {contact.phone && <div><a href={`tel:${contact.phone}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{contact.phone}</a></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RSVP section */}
          {event.status !== 'cancelled' && authed && (
            <RSVPForm
              eventId={event.id}
              onRSVPChange={setRsvps}
              allRsvps={rsvps}
            />
          )}
        </div>
      </div>
      )}

      {/* ── Modals ── */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeModal === 'going' && <><Users size={18} color="var(--accent-emerald)" /> Guest List</>}
                {activeModal === 'food' && <><UtensilsCrossed size={18} color="#fdba74" /> Food Pledges</>}
                {activeModal === 'decor' && <><Palette size={18} color="var(--text-accent)" /> Decor Helpers</>}
                {activeModal === 'activity' && <><Gamepad2 size={18} color="var(--accent-amber)" /> Activities</>}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveModal(null)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              {activeModal === 'going' && (
                <AttendeeList rsvps={rsvps} myAttendeeId={session?.attendeeId} />
              )}
              
              {activeModal === 'food' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {rsvps.filter(r => r.food_pledge).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No food pledges yet.</p>
                  ) : (
                    rsvps.filter(r => r.food_pledge).map(r => {
                      const pledges = r.food_pledge!.split(',').map(p => p.trim()).filter(Boolean);
                      return (
                        <div key={r.id} style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>{r.attendee?.name}</div>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {pledges.map((p, i) => (
                              <span key={i} className="badge badge-food" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {activeModal === 'decor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {rsvps.filter(r => r.helping_with_decor).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No decor helpers yet.</p>
                  ) : (
                    rsvps.filter(r => r.helping_with_decor).map(r => (
                      <div key={r.id} style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                        <div className="avatar" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.6rem' }}>
                          {r.attendee?.name.slice(0, 2).toUpperCase()}
                        </div>
                        {r.attendee?.name}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeModal === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {rsvps.filter(r => r.host_activity).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No activities planned yet.</p>
                  ) : (
                    rsvps.filter(r => r.host_activity).map(r => {
                      const activities = r.host_activity!.split(',').map(a => a.trim()).filter(Boolean);
                      return (
                        <div key={r.id} style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>{r.attendee?.name}</div>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {activities.map((a, i) => (
                              <span key={i} className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>{a}</span>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
