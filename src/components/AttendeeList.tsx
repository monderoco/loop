import type { RSVP } from '../types'
import { CheckCircle2, XCircle, HelpCircle, Clock, UtensilsCrossed, Palette } from 'lucide-react'

interface AttendeeListProps {
  rsvps: RSVP[]
  myAttendeeId?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const STATUS_ICON = {
  going: <CheckCircle2 size={13} color="#10b981" />,
  maybe: <HelpCircle size={13} color="#f59e0b" />,
  not_going: <XCircle size={13} color="#f43f5e" />,
}

const STATUS_BADGE_CLASS = {
  going: 'badge-going',
  maybe: 'badge-maybe',
  not_going: 'badge-not-going',
}

const STATUS_LABEL = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: "Can't go",
}

export default function AttendeeList({ rsvps, myAttendeeId }: AttendeeListProps) {
  const going = rsvps.filter(r => r.status === 'going')
  const maybe = rsvps.filter(r => r.status === 'maybe')
  const notGoing = rsvps.filter(r => r.status === 'not_going')

  const grouped = [
    { label: 'Going', items: going },
    { label: 'Maybe', items: maybe },
    { label: "Can't go", items: notGoing },
  ].filter(g => g.items.length > 0)

  if (rsvps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <p style={{ fontSize: '0.9rem' }}>No RSVPs yet — be the first!</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {grouped.map(group => (
        <div key={group.label}>
          <p className="section-heading">{group.label} · {group.items.length}</p>
          <div className="attendee-list">
            {group.items.map(rsvp => {
              const isMe = rsvp.attendee_id === myAttendeeId
              return (
                <div
                  key={rsvp.id}
                  className="attendee-row"
                  style={isMe ? { borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.07)' } : undefined}
                >
                  <div
                    className="avatar"
                    style={isMe ? { background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' } : undefined}
                  >
                    {getInitials(rsvp.attendee?.name || '?')}
                  </div>

                  <div className="attendee-row__name">
                    {rsvp.attendee?.name || 'Unknown'}
                    {isMe && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--text-accent)', fontWeight: 500 }}>
                        (you)
                      </span>
                    )}
                  </div>

                  <div className="attendee-row__badges">
                    {rsvp.is_late && (
                      <span className="badge badge-late" title={rsvp.late_note || 'Arriving late'}>
                        <Clock size={10} /> Late
                      </span>
                    )}
                    {rsvp.food_pledge && (
                      <span className="badge badge-food" title={rsvp.food_pledge}>
                        <UtensilsCrossed size={10} />
                        {rsvp.food_pledge.length > 14 ? rsvp.food_pledge.slice(0, 14) + '…' : rsvp.food_pledge}
                      </span>
                    )}
                    {rsvp.helping_with_decor && (
                      <span className="badge badge-decor">
                        <Palette size={10} /> Decor
                      </span>
                    )}
                    <span className={`badge ${STATUS_BADGE_CLASS[rsvp.status]}`}>
                      {STATUS_ICON[rsvp.status]}
                      {STATUS_LABEL[rsvp.status]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
