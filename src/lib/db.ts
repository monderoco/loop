import { supabase } from './supabase'
import type { Attendee, Event, Organizer, RSVP, PasskeySession } from '../types'

// ── Session helpers ──────────────────────────────────────────────────────────

const SESSION_KEY = 'rsvp_session'

export function getSession(): PasskeySession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(session: PasskeySession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// ── Attendees ────────────────────────────────────────────────────────────────

/** Look up an attendee by credential ID */
export async function findAttendeeByCredentialId(credentialId: string): Promise<Attendee | null> {
  const { data: device, error: deviceError } = await supabase
    .from('loop_attendee_devices')
    .select('attendee_id')
    .eq('credential_id', credentialId)
    .maybeSingle()

  if (deviceError) { console.error('findAttendeeByCredentialId error:', deviceError); return null }
  if (!device) return null;

  const { data: attendee, error: attendeeError } = await supabase
    .from('loop_attendees')
    .select('*')
    .eq('id', device.attendee_id)
    .single()

  if (attendeeError) { console.error('findAttendeeByCredentialId error:', attendeeError); return null }
  return attendee
}

/**
 * Search for attendees with a similar name.
 * Uses the server-side fuzzy search RPC if available,
 * falls back to a client-side ilike query.
 */
export async function findAttendeesByName(name: string): Promise<Attendee[]> {
  // Try the RPC function (requires pg_trgm + the function from supabase_schema.sql)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('loop_search_attendees_by_name', { search_name: name })

  if (!rpcError && rpcData) return rpcData as Attendee[]

  // Fallback: simple ilike search
  const firstName = name.trim().split(/\s+/)[0]
  const { data, error } = await supabase
    .from('loop_attendees')
    .select('*')
    .ilike('name', `%${firstName}%`)
    .limit(5)

  if (error) { console.error('findAttendeesByName error:', error); return [] }
  return data || []
}

/** Create a new attendee */
export async function createAttendee(
  name: string,
  credentialId: string,
  publicKey: string
): Promise<Attendee | null> {
  const { data, error } = await supabase
    .from('loop_attendees')
    .insert({ name, credential_id: credentialId, public_key: publicKey })
    .select()
    .single()

  if (error) { console.error('createAttendee error:', error); return null }
  
  // Also insert into devices table
  await supabase.from('loop_attendee_devices').insert({
    attendee_id: data.id,
    credential_id: credentialId,
    public_key: publicKey,
    device_name: 'Original Device'
  });

  return data
}

/** Update an attendee's name (organizer action) */
export async function updateAttendeeName(id: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from('loop_attendees')
    .update({ name })
    .eq('id', id)

  if (error) { console.error('updateAttendeeName error:', error); return false }
  return true
}

/** Delete an attendee (cascades their RSVPs) */
export async function deleteAttendee(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('loop_attendees')
    .delete()
    .eq('id', id)

  if (error) { console.error('deleteAttendee error:', error); return false }
  return true
}

// ── Events ───────────────────────────────────────────────────────────────────

/** List all events for the current organizer */
export async function getOrganizerEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('loop_events')
    .select('*')
    .order('event_date', { ascending: true })

  if (error) { console.error('getOrganizerEvents error:', error); return [] }
  return data || []
}

/** Get a single event by ID */
export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('loop_events')
    .select('*, organizer:loop_organizers(*)')
    .eq('id', id)
    .single()

  if (error) { console.error('getEvent error:', error); return null }
  return data
}

/** Create a new event */
export async function createEvent(
  event: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'organizer'>
): Promise<Event | null> {
  const { data, error } = await supabase
    .from('loop_events')
    .insert({ ...event, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) { console.error('createEvent error:', error); return null }
  return data
}

/** Update an event */
export async function updateEvent(
  id: string,
  updates: Partial<Omit<Event, 'id' | 'created_at' | 'organizer'>>
): Promise<Event | null> {
  const { data, error } = await supabase
    .from('loop_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) { console.error('updateEvent error:', error); return null }
  return data
}

/** Delete an event */
export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('loop_events')
    .delete()
    .eq('id', id)

  if (error) { console.error('deleteEvent error:', error); return false }
  return true
}

// ── Organizers ───────────────────────────────────────────────────────────────

/** Get organizer profile for current auth user */
export async function getOrganizerProfile(): Promise<Organizer | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('loop_organizers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) { console.error('getOrganizerProfile error:', error); return null }
  return data
}

/** Create or update organizer profile */
export async function upsertOrganizerProfile(name: string): Promise<Organizer | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('loop_organizers')
    .upsert({ id: user.id, name })
    .select()
    .single()

  if (error) { console.error('upsertOrganizerProfile error:', error); return null }
  return data
}

// ── RSVPs ────────────────────────────────────────────────────────────────────

/** Fetch all RSVPs for an event (organizer action) */
export async function getEventRSVPs(eventId: string): Promise<RSVP[]> {
  const { data, error } = await supabase
    .from('loop_rsvps')
    .select('*, attendee:loop_attendees(*), contact:loop_rsvp_contacts(contact_number, email, plus_ones_data)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) { console.error('getEventRSVPs error:', error); return [] }
  return (data || []).map((row: any) => ({
    ...row,
    contact_number: row.contact?.contact_number || undefined,
    email: row.contact?.email || undefined,
    plus_ones_data: row.contact?.plus_ones_data || undefined,
    contact: undefined
  }))
}

/** Get a single RSVP for an attendee + event */
export async function getMyRSVP(eventId: string, attendeeId: string): Promise<RSVP | null> {
  const { data, error } = await supabase
    .from('loop_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('attendee_id', attendeeId)
    .maybeSingle()

  if (error) { console.error('getMyRSVP error:', error); return null }
  
  if (data) {
    const { data: contactData } = await supabase.rpc('loop_get_my_contact', { p_rsvp_id: data.id })
    if (contactData) {
      data.contact_number = contactData.contact_number || undefined
      data.email = contactData.email || undefined
      data.plus_ones_data = contactData.plus_ones_data || undefined
    }
  }
  
  return data
}

/** Upsert an RSVP */
export async function upsertRSVP(
  rsvp: Omit<RSVP, 'id' | 'created_at' | 'updated_at' | 'attendee'>
): Promise<RSVP | null> {
  const { contact_number, email, plus_ones_data, ...rsvpData } = rsvp;

  const { data, error } = await supabase
    .from('loop_rsvps')
    .upsert(
      { ...rsvpData, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,attendee_id' }
    )
    .select()
    .single()

  if (error) { console.error('upsertRSVP error:', error); return null }

  if (contact_number || email || plus_ones_data?.length) {
    const { error: contactErr } = await supabase.rpc('loop_upsert_contact', {
      p_rsvp_id: data.id,
      p_contact_number: contact_number || null,
      p_email: email || null,
      p_plus_ones_data: plus_ones_data || []
    })
    if (contactErr) console.error('Failed to save contact:', contactErr)
  }

  return { ...data, contact_number, email, plus_ones_data }
}

/** Delete an RSVP (organizer action) */
export async function deleteRSVP(id: string): Promise<boolean> {
  const { error } = await supabase.from('loop_rsvps').delete().eq('id', id)
  if (error) { console.error('deleteRSVP error:', error); return false }
  return true
}

// ── Notifications ────────────────────────────────────────────────────────────

/** Notify guests about an event update or cancellation */
export async function notifyEventUpdate(eventId: string, updateType: 'update' | 'cancel', message: string = '') {
  const { error } = await supabase.functions.invoke('notify-event-update', {
    body: { eventId, updateType, message }
  })
  if (error) console.error('notifyEventUpdate error:', error)
}

// ── Device Links ─────────────────────────────────────────────────────────────

export async function createDeviceLink(code: string, secret: string, attendeeId?: string) {
  const { error } = await supabase
    .from('loop_device_links')
    .insert({ code, secret, status: 'pending', attendee_id: attendeeId || null })
  if (error) throw new Error(error.message)
}

export async function approveDeviceLink(code: string, attendeeId: string) {
  const { error } = await supabase.rpc('loop_approve_device_link', {
    p_code: code,
    p_attendee_id: attendeeId
  })
  if (error) throw new Error(error.message)
}

export async function consumeDeviceLink(code: string, secret: string, credentialId: string, publicKey: string, deviceName: string): Promise<string> {
  const { data, error } = await supabase.rpc('loop_consume_device_link', {
    p_code: code,
    p_secret: secret,
    p_credential_id: credentialId,
    p_public_key: publicKey,
    p_device_name: deviceName
  })
  if (error) throw new Error(error.message)
  return data as string
}
