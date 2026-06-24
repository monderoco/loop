create table if not exists loop_rsvp_contacts (
  rsvp_id        uuid primary key references loop_rsvps(id) on delete cascade,
  contact_number text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table loop_rsvp_contacts enable row level security;

create policy "contacts_organizer_read"
  on loop_rsvp_contacts for select
  using (auth.uid() is not null);

create policy "contacts_public_insert"
  on loop_rsvp_contacts for insert with check (true);

create policy "contacts_public_update"
  on loop_rsvp_contacts for update using (true) with check (true);
