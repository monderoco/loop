alter table loop_rsvps add column if not exists host_activity text;
alter table loop_rsvp_contacts add column if not exists plus_ones_data jsonb default '[]'::jsonb;

-- Update loop_upsert_contact
drop function if exists loop_upsert_contact(uuid, text, text);

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

-- Update loop_get_my_contact
create or replace function loop_get_my_contact(p_rsvp_id uuid)
returns json
language sql
security definer
as $$
  select json_build_object('contact_number', contact_number, 'email', email, 'plus_ones_data', plus_ones_data)
  from loop_rsvp_contacts
  where rsvp_id = p_rsvp_id;
$$;
