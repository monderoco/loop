create or replace function loop_upsert_contact(p_rsvp_id uuid, p_contact_number text, p_email text)
returns void
language sql
security definer
as $$
  insert into loop_rsvp_contacts (rsvp_id, contact_number, email, updated_at)
  values (p_rsvp_id, p_contact_number, p_email, now())
  on conflict (rsvp_id) do update
  set contact_number = excluded.contact_number,
      email = excluded.email,
      updated_at = excluded.updated_at;
$$;
