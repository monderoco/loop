export interface Event {
  id: string
  title: string
  slug?: string
  description: string // markdown
  location: string
  event_date: string  // ISO datetime
  cover_image_url?: string
  video_url?: string
  organizer_id?: string
  organizer?: Organizer
  created_at: string
  updated_at: string
}

export interface Organizer {
  id: string
  name: string
  created_at: string
}

export interface Attendee {
  id: string
  name: string
  credential_id: string // base64url-encoded WebAuthn credential ID
  public_key: string    // base64url-encoded attestation object
  created_at: string
}

export interface RSVP {
  id: string
  event_id: string
  attendee_id: string
  status: 'going' | 'not_going' | 'maybe'
  is_late: boolean
  late_note?: string
  food_pledge?: string
  helping_with_decor: boolean
  contact_number?: string
  created_at: string
  updated_at: string
  // joined
  attendee?: Attendee
}

export interface PasskeySession {
  attendeeId: string
  name: string
  credentialId: string
}

/** Parsed hash route */
export type Route =
  | { page: 'event'; eventId: string }
  | { page: 'organizer-login' }
  | { page: 'organizer-setup' }
  | { page: 'organizer-dashboard' }
  | { page: 'event-form'; eventId?: string }       // create or edit
  | { page: 'manage-attendees'; eventId: string }
  | { page: 'demo' }
