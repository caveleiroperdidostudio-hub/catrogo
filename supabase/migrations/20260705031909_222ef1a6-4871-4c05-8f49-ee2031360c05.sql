-- Add app-generated phone number to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_phone text UNIQUE,
  ADD COLUMN IF NOT EXISTS app_phone_confirmed boolean NOT NULL DEFAULT false;

-- Allow authenticated users to see app_phone (shareable in-app number) and manage their own confirmation flag
GRANT SELECT (app_phone, app_phone_confirmed) ON public.profiles TO authenticated;
GRANT UPDATE (app_phone_confirmed) ON public.profiles TO authenticated;

-- Generator: unique in-app phone number
CREATE OR REPLACE FUNCTION public.generate_app_phone()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _num text;
BEGIN
  LOOP
    _num := '+55 9' || lpad((floor(random()*10000))::int::text, 4, '0')
            || '-' || lpad((floor(random()*10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE app_phone = _num);
  END LOOP;
  RETURN _num;
END $$;

-- Assign (idempotent) the caller's app phone and return it
CREATE OR REPLACE FUNCTION public.assign_app_phone()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _me uuid := auth.uid(); _cur text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT app_phone INTO _cur FROM public.profiles WHERE id = _me;
  IF _cur IS NULL THEN
    _cur := public.generate_app_phone();
    UPDATE public.profiles SET app_phone = _cur WHERE id = _me;
  END IF;
  RETURN _cur;
END $$;

GRANT EXECUTE ON FUNCTION public.assign_app_phone() TO authenticated;

-- New accounts also get a number generated at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_username text;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  if v_username = '' or v_username is null then v_username := 'user_' || substr(new.id::text, 1, 8); end if;
  while exists(select 1 from public.profiles where username = v_username) loop
    v_username := v_username || substr(md5(random()::text),1,3);
  end loop;
  insert into public.profiles (id, username, display_name, app_phone)
    values (new.id, v_username, v_name, public.generate_app_phone());
  return new;
end $function$;