create or replace function loop_get_my_contact(p_rsvp_id uuid)
returns json
language sql
security definer
as $$
  select json_build_object('contact_number', contact_number, 'email', email)
  from loop_rsvp_contacts
  where rsvp_id = p_rsvp_id;
$$;
