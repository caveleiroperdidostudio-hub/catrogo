-- UGC: vídeos, jogos, interações e seguidores

-- Vídeos postados pelos usuários
CREATE TABLE public.posts_video (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  format TEXT NOT NULL DEFAULT 'long',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts_video TO authenticated;
GRANT ALL ON public.posts_video TO service_role;

ALTER TABLE public.posts_video ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by authenticated"
  ON public.posts_video FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own videos"
  ON public.posts_video FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own videos"
  ON public.posts_video FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own videos"
  ON public.posts_video FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_posts_video_user ON public.posts_video(user_id);
CREATE INDEX idx_posts_video_format ON public.posts_video(format, created_at DESC);

-- Jogos criados na engine Newcatroid
CREATE TABLE public.projects_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_code TEXT NOT NULL DEFAULT '',
  plays INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects_games TO authenticated;
GRANT ALL ON public.projects_games TO service_role;

ALTER TABLE public.projects_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by authenticated"
  ON public.projects_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own games"
  ON public.projects_games FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own games"
  ON public.projects_games FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own games"
  ON public.projects_games FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_projects_games_user ON public.projects_games(user_id);

-- Interações: curtidas e comentários em vídeos e jogos
CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  kind TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactions TO authenticated;
GRANT ALL ON public.interactions TO service_role;

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interactions are viewable by authenticated"
  ON public.interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own interactions"
  ON public.interactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own interactions"
  ON public.interactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE UNIQUE INDEX idx_interactions_like_unique
  ON public.interactions(user_id, target_type, target_id)
  WHERE kind = 'like';
CREATE INDEX idx_interactions_target ON public.interactions(target_type, target_id);

-- Seguidores
CREATE TABLE public.follows (
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by authenticated"
  ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users follow as themselves"
  ON public.follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid() AND follower_id <> following_id);
CREATE POLICY "Users unfollow themselves"
  ON public.follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- Contador de views/plays sem precisar de UPDATE policy aberta
CREATE OR REPLACE FUNCTION public.increment_video_views(_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.posts_video SET views = views + 1 WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.increment_game_plays(_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.projects_games SET plays = plays + 1 WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_video_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_game_plays(UUID) TO authenticated;