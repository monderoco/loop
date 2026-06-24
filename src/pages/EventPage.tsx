import { useState, useEffect, useCallback } from 'react'
import type { Event, RSVP } from '../types'
import { supabase } from '../lib/supabase'
import { getEventRSVPs } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { MapPin, Calendar, Clock, Users, UtensilsCrossed, Palette } from 'lucide-react'
import Markdown from '../components/Markdown'
import RSVPForm from '../components/RSVPForm'
import AttendeeList from '../components/AttendeeList'
import PasskeyGate from '../components/PasskeyGate'

interface EventPageProps {
  eventId: string
}

type ActiveTab = 'details' | 'guests'

export default function EventPage({ eventId }: EventPageProps) {
  const { session } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('details')
  const [showGate, setShowGate] = useState(false)
  const [authed, setAuthed] = useState(!!session)

  const loadEvent = useCallback(async () => {
    // If eventId looks like a UUID, match by id or slug. Otherwise, match by slug.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
    const query = supabase.from('loop_events').select('*');
    const { data, error } = await (isUuid 
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
  useEffect(() => { if (authed) loadRSVPs() }, [authed, loadRSVPs])

  const going = rsvps.filter(r => r.status === 'going').length
  const maybe = rsvps.filter(r => r.status === 'maybe').length
  const decor = rsvps.filter(r => r.helping_with_decor).length
  const food = rsvps.filter(r => r.food_pledge).length

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
              {event.location}
            </div>
            <div className="event-hero__meta-item">
              <Users size={15} color="var(--accent-emerald)" />
              {going} going{maybe > 0 ? `, ${maybe} maybe` : ''}
            </div>
          </div>
        </section>

        {/* ── Stats bar ── */}
        {rsvps.length > 0 && (
          <div className="stats-bar fade-in fade-in--delay-1" style={{ marginBottom: '2rem' }}>
            <div className="stat-cell">
              <div className="stat-number" style={{ color: 'var(--accent-emerald)' }}>{going}</div>
              <div className="stat-cell__label">Going</div>
            </div>
            <div className="stat-cell">
              <div className="stat-number" style={{ color: '#fdba74' }}>{food}</div>
              <div className="stat-cell__label">Food pledges</div>
            </div>
            <div className="stat-cell">
              <div className="stat-number" style={{ color: 'var(--text-accent)' }}>{decor}</div>
              <div className="stat-cell__label">Decor helpers</div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="tabs fade-in fade-in--delay-1">
          <button
            id="tab-details"
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Event Details
          </button>
          <button
            id="tab-guests"
            className={`tab ${activeTab === 'guests' ? 'active' : ''}`}
            onClick={() => setActiveTab('guests')}
          >
            Guests ({rsvps.length})
          </button>
        </div>

        {/* ── Details tab ── */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Description card */}
            <div className="card fade-in">
              <Markdown content={event.description} />
            </div>

            {/* RSVP section */}
            {authed ? (
              <RSVPForm
                eventId={event.id}
                onRSVPChange={setRsvps}
              />
            ) : (
              <div
                className="card fade-in"
                style={{
                  textAlign: 'center',
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  borderStyle: 'dashed',
                  borderColor: 'rgba(139,92,246,0.3)',
                  background: 'rgba(139,92,246,0.04)',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>🎟️</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                    Ready to RSVP?
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px' }}>
                    It only takes a second. We'll save your response with a passkey — no account needed.
                  </p>
                </div>
                <button
                  id="btn-rsvp-cta"
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowGate(true)}
                >
                  RSVP to this event
                </button>
              </div>
            )}

            {/* Food & Decor summary (if there are pledges) */}
            {(food > 0 || decor > 0) && (
              <div
                className="card fade-in"
                style={{
                  display: 'grid',
                  gridTemplateColumns: food > 0 && decor > 0 ? '1fr 1fr' : '1fr',
                  gap: '1.5rem',
                }}
              >
                {food > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <UtensilsCrossed size={15} color="var(--accent-amber)" />
                      <span className="section-heading" style={{ margin: 0 }}>Food pledges</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {rsvps
                        .filter(r => r.food_pledge)
                        .map(r => (
                          <div key={r.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.attendee?.name}</span>
                            {' — '}{r.food_pledge}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {decor > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Palette size={15} color="var(--accent-purple)" />
                      <span className="section-heading" style={{ margin: 0 }}>Decor helpers</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {rsvps
                        .filter(r => r.helping_with_decor)
                        .map(r => (
                          <div key={r.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.attendee?.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Guests tab ── */}
        {activeTab === 'guests' && (
          <div className="card fade-in">
            <AttendeeList
              rsvps={rsvps}
              myAttendeeId={session?.attendeeId}
            />
          </div>
        )}
      </div>
    </>
  )
}
