CREATE TABLE IF NOT EXISTS loop_attendee_devices (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid not null references loop_attendees(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  device_name text,
  created_at timestamptz not null default now()
);

-- Migrate existing credentials
INSERT INTO loop_attendee_devices (attendee_id, credential_id, public_key, device_name)
SELECT id, credential_id, public_key, 'Original Device'
FROM loop_attendees
ON CONFLICT (credential_id) DO NOTHING;

-- We can drop credential_id/public_key from loop_attendees later, but keep for now to avoid breaking existing code immediately.

CREATE TABLE IF NOT EXISTS loop_device_links (
  code text primary key,
  secret text not null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  attendee_id uuid references loop_attendees(id) on delete cascade,
  created_at timestamptz not null default now()
);

ALTER TABLE loop_attendee_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_device_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_public_read" ON loop_attendee_devices FOR SELECT USING (true);
CREATE POLICY "links_public_all" ON loop_device_links FOR ALL USING (true) WITH CHECK (true);

-- RPC to approve a link
CREATE OR REPLACE FUNCTION loop_approve_device_link(p_code text, p_attendee_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE loop_device_links
  SET status = 'approved', attendee_id = p_attendee_id
  WHERE code = p_code AND status = 'pending';
$$;

-- RPC to consume a link and register new device
CREATE OR REPLACE FUNCTION loop_consume_device_link(p_code text, p_secret text, p_credential_id text, p_public_key text, p_device_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attendee_id uuid;
BEGIN
  SELECT attendee_id INTO v_attendee_id
  FROM loop_device_links
  WHERE code = p_code AND secret = p_secret AND status = 'approved';

  IF v_attendee_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or unapproved link code';
  END IF;

  INSERT INTO loop_attendee_devices (attendee_id, credential_id, public_key, device_name)
  VALUES (v_attendee_id, p_credential_id, p_public_key, p_device_name);

  DELETE FROM loop_device_links WHERE code = p_code;

  RETURN v_attendee_id;
END;
$$;
