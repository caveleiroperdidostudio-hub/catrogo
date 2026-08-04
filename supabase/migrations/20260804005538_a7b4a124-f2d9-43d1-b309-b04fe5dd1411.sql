-- 1. Remove direct column access to game source code
REVOKE SELECT (source_code) ON public.projects_games FROM anon, authenticated;

-- 2. Restrict event_missions reads to authenticated users
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='event_missions' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.event_missions', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Event missions readable by authenticated"
ON public.event_missions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.event_missions FROM anon;

-- 3. Restrict global_events reads to authenticated users
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='global_events' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.global_events', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Global events readable by authenticated"
ON public.global_events FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.global_events FROM anon;