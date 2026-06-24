import { useState, useEffect, useCallback } from 'react'
import { useOrganizer } from '../../context/OrganizerContext'
import { getEvent, createEvent, updateEvent } from '../../lib/db'
import type { Event } from '../../types'
import { format } from 'date-fns'
import {
  ArrowLeft, Save, Eye, EyeOff, Calendar, MapPin,
  FileText, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react'
import Markdown from '../../components/Markdown'

function navigate(hash: string) { window.location.hash = hash }

interface EventFormPageProps {
  eventId?: string  // undefined = create mode
}

const BLANK_FORM = {
  title: '',
  slug: '',
  description: '',
  location: '',
  event_date: '',
  event_time: '18:00',
  cover_image_url: '',
  video_url: '',
}

export default function EventFormPage({ eventId }: EventFormPageProps) {
  const { organizer } = useOrganizer()
  const isEdit = !!eventId

  const [form, setForm] = useState(BLANK_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMd, setPreviewMd] = useState(false)

  const loadEvent = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    const event = await getEvent(eventId)
    if (event) {
      const dt = new Date(event.event_date)
      setForm({
        title: event.title,
        slug: event.slug || '',
        description: event.description,
        location: event.location,
        event_date: format(dt, 'yyyy-MM-dd'),
        event_time: format(dt, 'HH:mm'),
        cover_image_url: event.cover_image_url || '',
        video_url: event.video_url || '',
      })
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => { loadEvent() }, [loadEvent])

  function setField(field: keyof typeof BLANK_FORM, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Please enter an event title'); return }
    if (!form.event_date) { setError('Please select a date'); return }
    if (!form.location.trim()) { setError('Please enter a location'); return }

    const dateTime = new Date(`${form.event_date}T${form.event_time || '18:00'}`)

    setSaving(true)
    setError(null)

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || undefined,
      description: form.description,
      location: form.location.trim(),
      event_date: dateTime.toISOString(),
      cover_image_url: form.cover_image_url || undefined,
      video_url: form.video_url || undefined,
      organizer_id: organizer!.id,
    }

    let result: Event | null = null
    if (isEdit) {
      result = await updateEvent(eventId!, payload)
    } else {
      result = await createEvent(payload)
    }

    if (!result) {
      setError('Failed to save event. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSaved(true)

    if (!isEdit) {
      // Redirect to manage page for the newly created event
      setTimeout(() => navigate(`/organizer/event/${result!.id}/manage`), 800)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <div className="spinner" /> <span>Loading event…</span>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/organizer/dashboard')}
        style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}
        id="btn-back-to-dashboard"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          marginBottom: '0.35rem',
        }}
      >
        {isEdit ? 'Edit event' : 'New event'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        {isEdit ? 'Update the details below.' : 'Fill in the details to create your event.'}
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="section-heading" style={{ marginBottom: 0 }}>Basic info</p>

          <div className="input-group">
            <label className="input-label" htmlFor="input-event-title">Event title *</label>
            <input
              id="input-event-title"
              className="input"
              type="text"
              placeholder="Summer Garden Party 🌸"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              maxLength={120}
              autoFocus={!isEdit}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="input-event-slug">URL slug (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ padding: '0.65rem 0.5rem 0.65rem 0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                loop.mondero.nz/#/event/
              </span>
              <input
                id="input-event-slug"
                className="input"
                type="text"
                placeholder="summer-party"
                value={form.slug}
                onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                maxLength={60}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              />
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="input-event-date">
                <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
                Date *
              </label>
              <input
                id="input-event-date"
                className="input"
                type="date"
                value={form.event_date}
                onChange={e => setField('event_date', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="input-event-time">Time</label>
              <input
                id="input-event-time"
                className="input"
                type="time"
                value={form.event_time}
                onChange={e => setField('event_time', e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="input-group">
            <label className="input-label" htmlFor="input-event-location">
              <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              Location *
            </label>
            <input
              id="input-event-location"
              className="input"
              type="text"
              placeholder="42 Blossom Lane, Greenfield"
              value={form.location}
              onChange={e => setField('location', e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        {/* Description (markdown) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={14} color="var(--accent-purple)" />
              <p className="section-heading" style={{ marginBottom: 0 }}>Description</p>
              <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--text-accent)', border: '1px solid rgba(139,92,246,0.2)', fontSize: '0.65rem' }}>
                Markdown
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPreviewMd(p => !p)}
              id="btn-toggle-preview"
            >
              {previewMd ? <><EyeOff size={13} /> Edit</> : <><Eye size={13} /> Preview</>}
            </button>
          </div>

          {previewMd ? (
            <div
              style={{
                minHeight: '200px',
                padding: '1rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              {form.description ? (
                <Markdown content={form.description} />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label" htmlFor="input-event-description">
                Supports Markdown, images, and YouTube/Vimeo links
              </label>
              <textarea
                id="input-event-description"
                className="input"
                placeholder={`## Welcome!\n\nDescribe your event here. You can use **bold**, *italic*, lists, and more.\n\nPaste a YouTube link on its own line and it will embed automatically.`}
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                style={{ minHeight: '240px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.88rem' }}
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/organizer/dashboard')}
          >
            Cancel
          </button>
          <button
            id="btn-save-event"
            type="submit"
            className={`btn ${saved ? 'btn-going active' : 'btn-primary'} btn-lg`}
            disabled={saving}
          >
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
              : saved
              ? <><CheckCircle2 size={15} /> Saved!</>
              : <><Save size={15} /> {isEdit ? 'Save changes' : 'Create event'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
