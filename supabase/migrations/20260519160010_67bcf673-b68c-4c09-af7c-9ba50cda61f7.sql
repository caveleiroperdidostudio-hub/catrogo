CREATE OR REPLACE FUNCTION public.start_dm(_other uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other = _me THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;

  -- find existing 1-1
  SELECT c.id INTO _conv
  FROM conversations c
  JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = _me
  JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = _other
  WHERE c.is_group = false AND coalesce(c.name,'') <> 'Jarvis IA'
  LIMIT 1;
  IF _conv IS NOT NULL THEN RETURN _conv; END IF;

  INSERT INTO conversations (is_group, created_by) VALUES (false, _me) RETURNING id INTO _conv;
  INSERT INTO conversation_members (conversation_id, user_id, is_admin) VALUES
    (_conv, _me, true),
    (_conv, _other, false);
  RETURN _conv;
END $$;

CREATE OR REPLACE FUNCTION public.create_group(_name text, _members uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
  _uid uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(trim(_name),'') = '' THEN RAISE EXCEPTION 'Name required'; END IF;

  INSERT INTO conversations (is_group, name, created_by) VALUES (true, _name, _me) RETURNING id INTO _conv;
  INSERT INTO conversation_members (conversation_id, user_id, is_admin) VALUES (_conv, _me, true);
  FOREACH _uid IN ARRAY _members LOOP
    IF _uid <> _me THEN
      INSERT INTO conversation_members (conversation_id, user_id, is_admin) VALUES (_conv, _uid, false)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN _conv;
END $$;