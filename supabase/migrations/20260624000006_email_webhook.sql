create trigger "send_rsvp_email_trigger"
  after insert or update on "public"."loop_rsvp_contacts"
  for each row
  execute function "supabase_functions"."http_request"(
    'http://supabase_kong:8000/functions/v1/send-rsvp-email',
    'POST',
    '{"Content-type":"application/json"}',
    '{}',
    '1000'
  );
