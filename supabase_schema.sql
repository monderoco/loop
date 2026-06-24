-- ============================================================
-- Loop App — Supabase Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable pg_trgm extension for similarity() — must be before functions
create extension if not exists pg_trgm;

-- ── Events ──────────────────────────────────────────────────
create table if not exists loop_events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique,
  description     text not null default '',  -- markdown
  location        text not null default '',
  event_date      timestamptz not null,
  cover_image_url text,
  video_url       text,
  contacts        jsonb default '[]'::jsonb,
  organizer_id    uuid,  -- references auth.users, set below
  status          text not null default 'active' check (status in ('active', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Organizer profiles ───────────────────────────────────────
-- Organizers authenticate via Supabase Auth (magic link / email).
-- This table stores their display name, linked to auth.users.
create table if not exists loop_organizers (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Now add the FK from loop_events → loop_organizers
alter table loop_events
  add constraint fk_events_organizer
  foreign key (organizer_id) references loop_organizers(id) on delete set null;

-- ── Attendees (passkey / guest users) ───────────────────────
create table if not exists loop_attendees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  credential_id text not null unique,  -- base64url WebAuthn credential ID
  public_key    text not null,         -- base64url attestation object
  created_at    timestamptz not null default now()
);

-- ── RSVPs ───────────────────────────────────────────────────
create table if not exists loop_rsvps (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references loop_events(id) on delete cascade,
  attendee_id        uuid not null references loop_attendees(id) on delete cascade,
  status             text not null check (status in ('going', 'not_going', 'maybe')),
  plus_ones          integer not null default 0,
  is_late            boolean not null default false,
  late_note          text,
  food_pledge        text,
  helping_with_decor boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  host_activity      text,

  unique (event_id, attendee_id)
);

-- ── Row Level Security ───────────────────────────────────────
alter table loop_events     enable row level security;
alter table loop_organizers enable row level security;
alter table loop_attendees  enable row level security;
alter table loop_rsvps      enable row level security;

-- Events: anyone can read; only owning organizer can insert/update/delete
create policy "events_public_read"
  on loop_events for select using (true);

create policy "events_organizer_insert"
  on loop_events for insert
  with check (organizer_id = auth.uid());

create policy "events_organizer_update"
  on loop_events for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

create policy "events_organizer_delete"
  on loop_events for delete
  using (organizer_id = auth.uid());

-- Organizers: can read all profiles; can only insert/update their own
create policy "organizers_public_read"
  on loop_organizers for select using (true);

create policy "organizers_self_insert"
  on loop_organizers for insert
  with check (id = auth.uid());

create policy "organizers_self_update"
  on loop_organizers for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Attendees: public read + insert (guest registration)
-- Organizers can update (fix names) and delete (remove duplicates)
create policy "attendees_public_read"
  on loop_attendees for select using (true);

create policy "attendees_public_insert"
  on loop_attendees for insert with check (true);

create policy "attendees_organizer_update"
  on loop_attendees for update
  using (auth.uid() is not null);  -- any logged-in organizer

create policy "attendees_organizer_delete"
  on loop_attendees for delete
  using (auth.uid() is not null);

-- RSVPs: public read + insert/update by guests; organizers can delete
create policy "rsvps_public_read"
  on loop_rsvps for select using (true);

-- ── RSVP Contacts (Secure) ──────────────────────────────────
-- Stores private contact numbers for guests.
create table if not exists loop_rsvp_contacts (
  rsvp_id        uuid primary key references loop_rsvps(id) on delete cascade,
  contact_number text,
  email          text,
  plus_ones_data jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table loop_rsvp_contacts enable row level security;

-- Organizers can read all contacts
create policy "contacts_organizer_read"
  on loop_rsvp_contacts for select
  using (auth.uid() is not null);

-- Anyone can insert or update a contact when RSVPing
create policy "contacts_public_insert"
  on loop_rsvp_contacts for insert with check (true);

create policy "contacts_public_update"
  on loop_rsvp_contacts for update using (true) with check (true);

-- ── Helper function: secure contact upsert ──────────────────
-- Allows guests to upsert their contact info without needing SELECT permissions
create or replace function loop_upsert_contact(p_rsvp_id uuid, p_contact_number text, p_email text, p_plus_ones_data jsonb default '[]'::jsonb)
returns void
language sql
security definer
as $$
  insert into loop_rsvp_contacts (rsvp_id, contact_number, email, plus_ones_data, updated_at)
  values (p_rsvp_id, p_contact_number, p_email, p_plus_ones_data, now())
  on conflict (rsvp_id) do update
  set contact_number = excluded.contact_number,
      email = excluded.email,
      plus_ones_data = excluded.plus_ones_data,
      updated_at = excluded.updated_at;
$$;

create or replace function loop_get_my_contact(p_rsvp_id uuid)
returns json
language sql
security definer
as $$
  select json_build_object('contact_number', contact_number, 'email', email, 'plus_ones_data', plus_ones_data)
  from loop_rsvp_contacts
  where rsvp_id = p_rsvp_id;
$$;

create policy "rsvps_public_insert"
  on loop_rsvps for insert with check (true);

create policy "rsvps_public_update"
  on loop_rsvps for update using (true) with check (true);

create policy "rsvps_organizer_delete"
  on loop_rsvps for delete
  using (auth.uid() is not null);

-- ── Helper function: fuzzy name search ──────────────────────
-- Returns attendees whose name is similar to the input.
-- Used by the guest passkey gate to detect potential duplicates.
create or replace function loop_search_attendees_by_name(search_name text)
returns setof loop_attendees
language sql
security definer
as $$
  select *
  from loop_attendees
  where
    lower(name) ilike '%' || lower(search_name) || '%'
    or similarity(lower(name), lower(search_name)) > 0.3
  order by similarity(lower(name), lower(search_name)) desc
  limit 5;
$$;

