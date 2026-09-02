ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS rights_holder text,
  ADD COLUMN IF NOT EXISTS license_note text;

CREATE TABLE IF NOT EXISTS public.movie_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  position_sec integer not null default 0,
  duration_sec integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, movie_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_progress TO authenticated;
GRANT ALL ON public.movie_progress TO service_role;
ALTER TABLE public.movie_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.movie_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.movie_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, movie_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_favorites TO authenticated;
GRANT ALL ON public.movie_favorites TO service_role;
ALTER TABLE public.movie_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.movie_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());