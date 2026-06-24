import { useState, useEffect, useCallback } from 'react'
import type { RSVP } from '../types'
import { useAuth } from '../context/AuthContext'
import { getMyRSVP, upsertRSVP, getEventRSVPs } from '../lib/db'
import {
  CheckCircle2, XCircle, HelpCircle, Clock, Palette,
  UtensilsCrossed, Loader2, AlertCircle, Save, Phone
} from 'lucide-react'

const FOOD_OPTIONS = [
  { emoji: '🥗', label: 'Salad' },
  { emoji: '🍖', label: 'Meat dish' },
  { emoji: '🍜', label: 'Pasta' },
  { emoji: '🥧', label: 'Dessert' },
  { emoji: '🥤', label: 'Drinks' },
  { emoji: '🍞', label: 'Bread / Rolls' },
  { emoji: '🧀', label: 'Cheese board' },
  { emoji: '🍣', label: 'Sushi' },
  { emoji: '🌮', label: 'Tacos' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🥘', label: 'Stew / Curry' },
  { emoji: '✏️', label: 'Other (describe)' },
]

interface RSVPFormProps {
  eventId: string
  onRSVPChange?: (rsvps: RSVP[]) => void
}

export default function RSVPForm({ eventId, onRSVPChange }: RSVPFormProps) {
  const { session } = useAuth()
  const [myRSVP, setMyRSVP] = useState<RSVP | null>(null)
  const [status, setStatus] = useState<'going' | 'not_going' | 'maybe' | null>(null)
  const [isLate, setIsLate] = useState(false)
  const [lateNote, setLateNote] = useState('')
  const [foodPledge, setFoodPledge] = useState('')
  const [customFood, setCustomFood] = useState('')
  const [helpingWithDecor, setHelpingWithDecor] = useState(false)
  const [contactNumber, setContactNumber] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRSVP = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const rsvp = await getMyRSVP(eventId, session.attendeeId)
    if (rsvp) {
      setMyRSVP(rsvp)
      setStatus(rsvp.status)
      setIsLate(rsvp.is_late)
      setLateNote(rsvp.late_note || '')
      setFoodPledge(rsvp.food_pledge || '')
      setHelpingWithDecor(rsvp.helping_with_decor)
      setContactNumber(rsvp.contact_number || '')
      setShowDetails(true)
    }
    setLoading(false)
  }, [eventId, session])

  useEffect(() => { loadRSVP() }, [loadRSVP])

  const handleSave = useCallback(async () => {
    if (!session || !status) return
    setSaving(true)
    setError(null)
    const finalFood = foodPledge === '✏️ Other (describe)' ? customFood : foodPledge
    const result = await upsertRSVP({
      event_id: eventId,
      attendee_id: session.attendeeId,
      status,
      is_late: isLate,
      late_note: isLate ? lateNote : undefined,
      food_pledge: finalFood || undefined,
      helping_with_decor: helpingWithDecor,
      contact_number: contactNumber || undefined,
    })
    if (!result) {
      setError('Could not save your RSVP. Please try again.')
    } else {
      setMyRSVP(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      // Refresh global list
      const all = await getEventRSVPs(eventId)
      onRSVPChange?.(all)
    }
    setSaving(false)
  }, [session, status, eventId, isLate, lateNote, foodPledge, customFood, helpingWithDecor, contactNumber, onRSVPChange])

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading your RSVP…</span>
      </div>
    )
  }


  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <p className="section-heading">Your RSVP</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Hey <strong style={{ color: 'var(--text-primary)' }}>{session?.name}</strong> — are you coming?
        </p>

        {/* Status buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          <button
            id="btn-rsvp-going"
            className={`btn btn-going ${status === 'going' ? 'active' : ''}`}
            onClick={() => { setStatus('going'); setShowDetails(true) }}
          >
            <CheckCircle2 size={15} />
            Going
          </button>
          <button
            id="btn-rsvp-maybe"
            className={`btn btn-maybe ${status === 'maybe' ? 'active' : ''}`}
            onClick={() => { setStatus('maybe'); setShowDetails(true) }}
          >
            <HelpCircle size={15} />
            Maybe
          </button>
          <button
            id="btn-rsvp-notgoing"
            className={`btn btn-notgoing ${status === 'not_going' ? 'active' : ''}`}
            onClick={() => { setStatus('not_going'); setShowDetails(false) }}
          >
            <XCircle size={15} />
            Can't go
          </button>
        </div>
      </div>

      {/* Details — shown when going or maybe */}
      {showDetails && status !== 'not_going' && (
        <>
          <hr className="divider" style={{ margin: '0' }} />

          {/* Late arrival */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="checkbox-row" htmlFor="chk-late">
              <input
                id="chk-late"
                type="checkbox"
                checked={isLate}
                onChange={e => setIsLate(e.target.checked)}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Clock size={14} color="var(--accent-indigo)" />
                  I'll be arriving late
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>Let the host know you'll join after the start time</span>
              </div>
            </label>
            {isLate && (
              <input
                id="input-late-note"
                className="input"
                type="text"
                placeholder="How late? e.g. About 30 minutes after start"
                value={lateNote}
                onChange={e => setLateNote(e.target.value)}
              />
            )}
          </div>

          {/* Food pledge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <UtensilsCrossed size={15} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Food pledge</span>
              {foodPledge && (
                <span className="badge badge-food" style={{ marginLeft: 'auto' }}>
                  {foodPledge !== '✏️ Other (describe)' ? foodPledge : customFood || 'Custom'}
                </span>
              )}
            </div>

            <div className="food-grid">
              {FOOD_OPTIONS.map(opt => {
                const val = `${opt.emoji} ${opt.label}`
                return (
                  <button
                    key={opt.label}
                    type="button"
                    className={`food-chip ${foodPledge === val ? 'selected' : ''}`}
                    onClick={() => setFoodPledge(foodPledge === val ? '' : val)}
                    id={`food-${opt.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="food-chip__emoji">{opt.emoji}</span>
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {foodPledge === '✏️ Other (describe)' && (
              <input
                id="input-custom-food"
                className="input"
                type="text"
                placeholder="What will you bring?"
                value={customFood}
                onChange={e => setCustomFood(e.target.value)}
                style={{ marginTop: '0.6rem' }}
              />
            )}

            {!foodPledge && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Optional — skip if you're not bringing anything
              </p>
            )}
          </div>

          {/* Decor help */}
          <label className="checkbox-row" htmlFor="chk-decor">
            <input
              id="chk-decor"
              type="checkbox"
              checked={helpingWithDecor}
              onChange={e => setHelpingWithDecor(e.target.checked)}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <Palette size={14} color="var(--accent-purple)" />
                I can help with decorations
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>Happy to arrive early and set things up</span>
            </div>
          </label>

          {/* Contact number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            <label className="input-label" htmlFor="input-contact" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={14} color="var(--accent-emerald)" />
              Contact Number (optional)
            </label>
            <input
              id="input-contact"
              className="input"
              type="tel"
              placeholder="e.g. 021 123 4567"
              value={contactNumber}
              onChange={e => setContactNumber(e.target.value)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Only the organiser can see this.</span>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Save button */}
      {status && (
        <button
          id="btn-save-rsvp"
          className={`btn btn-primary btn-full ${saved ? 'btn-going active' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={15} /> Saved!</>
          ) : myRSVP ? (
            <><Save size={15} /> Update RSVP</>
          ) : (
            <><CheckCircle2 size={15} /> Submit RSVP</>
          )}
        </button>
      )}
    </div>
  )
}
