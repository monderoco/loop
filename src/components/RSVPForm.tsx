import { useState, useEffect, useCallback } from 'react'
import type { RSVP } from '../types'
import { useAuth } from '../context/AuthContext'
import { getMyRSVP, upsertRSVP, getEventRSVPs } from '../lib/db'
import {
  CheckCircle2, XCircle, HelpCircle, Clock, Palette,
  UtensilsCrossed, Loader2, AlertCircle, Save, Phone, Mail, Users, Gamepad2
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
  { emoji: '🍰', label: 'Cake' },
  { emoji: '✏️', label: 'Other (describe)' },
]

interface RSVPFormProps {
  eventId: string
  onRSVPChange?: (rsvps: RSVP[]) => void
  allRsvps?: RSVP[]
}

export default function RSVPForm({ eventId, onRSVPChange, allRsvps = [] }: RSVPFormProps) {
  const { session } = useAuth()
  const [myRSVP, setMyRSVP] = useState<RSVP | null>(null)
  const [status, setStatus] = useState<'going' | 'not_going' | 'maybe' | null>(null)
  const [plusOnes, setPlusOnes] = useState(0)
  const [isLate, setIsLate] = useState(false)
  const [lateNote, setLateNote] = useState('')
  const [foodPledge, setFoodPledge] = useState('')
  const [customFood, setCustomFood] = useState('')
  const [helpingWithDecor, setHelpingWithDecor] = useState(false)
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [hostActivity, setHostActivity] = useState('')
  const [isHosting, setIsHosting] = useState(false)
  const [plusOnesData, setPlusOnesData] = useState<any[]>([])
  const [showPlusOnesData, setShowPlusOnesData] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  
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
      setPlusOnes(rsvp.plus_ones || 0)
      setIsLate(rsvp.is_late)
      setLateNote(rsvp.late_note || '')
      setFoodPledge(rsvp.food_pledge || '')
      setHelpingWithDecor(rsvp.helping_with_decor)
      setContactNumber(rsvp.contact_number || '')
      setEmail(rsvp.email || '')
      setHostActivity(rsvp.host_activity || '')
      setIsHosting(!!rsvp.host_activity)
      setPlusOnesData(rsvp.plus_ones_data || [])
      setIsAnonymous(rsvp.is_anonymous || false)
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
      plus_ones: plusOnes,
      is_late: isLate,
      late_note: isLate ? lateNote : undefined,
      food_pledge: finalFood || undefined,
      helping_with_decor: helpingWithDecor,
      host_activity: isHosting ? (hostActivity || undefined) : undefined,
      contact_number: contactNumber || undefined,
      email: email || undefined,
      plus_ones_data: plusOnes > 0 ? plusOnesData.slice(0, plusOnes) : undefined,
      is_anonymous: isAnonymous,
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
  }, [session, status, eventId, plusOnes, isLate, lateNote, foodPledge, customFood, helpingWithDecor, contactNumber, email, hostActivity, isHosting, plusOnesData, isAnonymous, onRSVPChange])

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading your RSVP…</span>
      </div>
    )
  }

  const currentFood = foodPledge === '✏️ Other (describe)' ? customFood : foodPledge;
  const currentFoodItems = currentFood.split(',').map(f => f.trim()).filter(Boolean);
  
  const othersBringingFood = allRsvps.filter(r => {
    if (r.attendee_id === session?.attendeeId) return false;
    if (!r.food_pledge) return false;
    const theirItems = r.food_pledge.split(',').map(f => f.trim().toLowerCase());
    return currentFoodItems.some(item => theirItems.includes(item.toLowerCase()));
  }).length;

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

          {/* Plus ones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="input-label" htmlFor="input-plus-ones" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={14} color="var(--accent-purple)" />
              Bringing anyone else? (+1s)
            </label>
            <input
              id="input-plus-ones"
              className="input"
              type="number"
              min="0"
              value={plusOnes === 0 ? '' : plusOnes}
              placeholder="0"
              onChange={e => setPlusOnes(Math.max(0, parseInt(e.target.value || '0', 10)))}
              style={{ width: '100%', maxWidth: '200px' }}
            />
            {plusOnes > 0 && (
              <div style={{ marginTop: '0.5rem', background: 'var(--surface-sunken)', padding: '1rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowPlusOnesData(!showPlusOnesData)}
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                >
                  {showPlusOnesData ? 'Hide +1 Details' : 'Add contact info for your +1s (Optional)'}
                </button>
                {showPlusOnesData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {Array.from({ length: plusOnes }).map((_, i) => {
                      const data = plusOnesData[i] || { name: '', email: '', phone: '' }
                      const updateData = (field: string, value: string) => {
                        const newData = [...plusOnesData]
                        newData[i] = { ...data, [field]: value }
                        setPlusOnesData(newData)
                      }
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid var(--accent-purple)', paddingLeft: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Guest {i + 1}</span>
                          <input className="input" placeholder="Name" value={data.name} onChange={e => updateData('name', e.target.value)} />
                          <input className="input" placeholder="Email" type="email" value={data.email} onChange={e => updateData('email', e.target.value)} />
                          <input className="input" placeholder="Phone" type="tel" value={data.phone} onChange={e => updateData('phone', e.target.value)} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <UtensilsCrossed size={15} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Food pledge</span>
              {currentFoodItems.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  {currentFoodItems.map((f, i) => (
                    <span key={i} className="badge badge-food">{f}</span>
                  ))}
                </div>
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
                placeholder="What will you bring? (e.g. chips, salsa)"
                value={customFood}
                onChange={e => setCustomFood(e.target.value)}
                style={{ marginTop: '0.6rem' }}
              />
            )}

            {othersBringingFood > 0 && currentFoodItems.length > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', marginTop: '0.5rem', fontWeight: 500 }}>
                💡 Heads up! {othersBringingFood === 1 ? '1 other guest is' : `${othersBringingFood} other guests are`} bringing something similar.
              </p>
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

          {/* Hosting Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="checkbox-row" htmlFor="chk-host">
              <input
                id="chk-host"
                type="checkbox"
                checked={isHosting}
                onChange={e => setIsHosting(e.target.checked)}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Gamepad2 size={14} color="var(--accent-amber)" />
                  I'd like to host an activity
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>e.g. Bingo, board games, karaoke</span>
              </div>
            </label>
            {isHosting && (
              <input
                id="input-host-activity"
                className="input"
                type="text"
                placeholder="What activity would you like to host?"
                value={hostActivity}
                onChange={e => setHostActivity(e.target.value)}
              />
            )}
          </div>

          {/* Contact info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="input-label" htmlFor="input-contact" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={14} color="var(--accent-emerald)" />
                Phone (optional)
              </label>
              <input
                id="input-contact"
                className="input"
                type="tel"
                placeholder="e.g. 021 123 4567"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="input-label" htmlFor="input-email" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="var(--accent-indigo)" />
                Email (optional)
              </label>
              <input
                id="input-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="checkbox"
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600 }}>Hide my name from public guest list</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>You will appear as "Anonymous Guest" to everyone except the organizer.</span>
            </div>
          </label>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Only the organiser can see your contact info.</span>
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
