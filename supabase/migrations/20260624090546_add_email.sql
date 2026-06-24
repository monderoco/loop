alter table loop_rsvp_contacts add column if not exists email text;
alter table loop_rsvp_contacts alter column contact_number drop not null;
