-- ============ Ctrg UI: versões da interface ============
CREATE TABLE public.ui_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ui_version text NOT NULL,
  app_version text NOT NULL,
  kind text NOT NULL DEFAULT 'standard',
  released_at date NOT NULL DEFAULT (now() at time zone 'utc')::date,
  description text,
  status text NOT NULL DEFAULT 'current',
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ui_version, kind)
);
GRANT SELECT ON public.ui_versions TO anon;
GRANT SELECT ON public.ui_versions TO authenticated;
GRANT ALL ON public.ui_versions TO service_role;
ALTER TABLE public.ui_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ui_versions_read" ON public.ui_versions FOR SELECT USING (true);
CREATE POLICY "ui_versions_owner_write" ON public.ui_versions FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE TRIGGER ui_versions_updated_at BEFORE UPDATE ON public.ui_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Preferências de interface por usuário ============
CREATE TABLE public.ui_user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ui_version_id uuid REFERENCES public.ui_versions(id) ON DELETE SET NULL,
  ui_mode text NOT NULL DEFAULT 'STANDARD',
  skin text NOT NULL DEFAULT 'cosmos',
  density text NOT NULL DEFAULT 'comfortable',
  animations boolean NOT NULL DEFAULT true,
  effects boolean NOT NULL DEFAULT true,
  element_scale numeric NOT NULL DEFAULT 1,
  language text NOT NULL DEFAULT 'pt-BR',
  color_scheme text NOT NULL DEFAULT 'dark',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_user_preferences TO authenticated;
GRANT ALL ON public.ui_user_preferences TO service_role;
ALTER TABLE public.ui_user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uiprefs_own" ON public.ui_user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER uiprefs_updated_at BEFORE UPDATE ON public.ui_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Prêmio do app (libera Ctrg UI Pro) ============
CREATE TABLE public.app_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  award_key text NOT NULL DEFAULT 'ctrg_ui_pro',
  unlocked boolean NOT NULL DEFAULT true,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  granted_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, award_key)
);
GRANT SELECT, UPDATE ON public.app_awards TO authenticated;
GRANT ALL ON public.app_awards TO service_role;
ALTER TABLE public.app_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "awards_select_own_or_owner" ON public.app_awards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_owner());
CREATE POLICY "awards_toggle_own" ON public.app_awards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "awards_owner_manage" ON public.app_awards FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE TRIGGER app_awards_updated_at BEFORE UPDATE ON public.app_awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Personalização de perfil ============
CREATE TABLE public.profile_customization (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_theme text NOT NULL DEFAULT 'cosmos',
  accent_color text NOT NULL DEFAULT '#7C6BFF',
  banner_url text,
  card_style text NOT NULL DEFAULT 'glass',
  layout text NOT NULL DEFAULT 'classic',
  interests text[] NOT NULL DEFAULT '{}',
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_customization TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_customization TO authenticated;
GRANT ALL ON public.profile_customization TO service_role;
ALTER TABLE public.profile_customization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profcustom_public_read" ON public.profile_customization FOR SELECT USING (is_public = true);
CREATE POLICY "profcustom_own" ON public.profile_customization FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profcustom_updated_at BEFORE UPDATE ON public.profile_customization
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Museu (versões históricas navegáveis) ============
CREATE TABLE public.museum_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version text NOT NULL UNIQUE,
  label text NOT NULL,
  released_at date,
  summary text,
  ui_version text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  playable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.museum_versions TO anon;
GRANT SELECT ON public.museum_versions TO authenticated;
GRANT ALL ON public.museum_versions TO service_role;
ALTER TABLE public.museum_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "museum_read" ON public.museum_versions FOR SELECT USING (true);
CREATE POLICY "museum_owner_write" ON public.museum_versions FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

-- ============ Feature flags ============
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags_owner_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE TRIGGER flags_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Registro de navegação da IA ============
CREATE TABLE public.ai_navigation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool text NOT NULL,
  target text NOT NULL,
  allowed boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_navigation_logs TO authenticated;
GRANT ALL ON public.ai_navigation_logs TO service_role;
ALTER TABLE public.ai_navigation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ainav_select_own" ON public.ai_navigation_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_owner());

-- ============ Interface atual do usuário ============
CREATE OR REPLACE FUNCTION public.current_ui_version(_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pro boolean := false; _mode text := 'STANDARD'; _row public.ui_versions;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.app_awards a
    WHERE a.user_id = _user_id AND a.award_key = 'ctrg_ui_pro' AND a.unlocked AND a.active
  ) INTO _pro;
  IF NOT _pro AND _user_id IS NOT NULL THEN
    _pro := public.is_owner(_user_id) OR public.is_premium(_user_id);
  END IF;
  SELECT ui_mode INTO _mode FROM public.ui_user_preferences WHERE user_id = _user_id;
  IF _mode IS NULL THEN _mode := 'STANDARD'; END IF;
  IF NOT _pro THEN _mode := 'STANDARD'; END IF;

  SELECT * INTO _row FROM public.ui_versions
  WHERE status = 'current' AND available
    AND kind = CASE WHEN _mode = 'PRO' THEN 'pro' ELSE 'standard' END
  ORDER BY released_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'pro_available', _pro,
    'ui_mode', _mode,
    'name', COALESCE(_row.name, 'Ctrg UI'),
    'ui_version', COALESCE(_row.ui_version, '4.0'),
    'app_version', COALESCE(_row.app_version, '4.0.0'),
    'kind', COALESCE(_row.kind, 'standard')
  );
END $$;

-- ============ Dados iniciais ============
INSERT INTO public.ui_versions (name, ui_version, app_version, kind, released_at, description, status) VALUES
  ('Ctrg UI', '4.0', '4.0.0', 'standard', '2026-09-06', 'Primeira versão do sistema de design oficial do CatroGo: minimalista, futurista e espacial.', 'current'),
  ('Ctrg UI Pro', '4.0', '4.0.0', 'pro', '2026-09-06', 'Experiência premium do Ctrg UI: componentes, animações e skins exclusivas.', 'current');

INSERT INTO public.museum_versions (app_version, label, released_at, summary, ui_version, sort_order, config) VALUES
  ('1.0.0', 'CatroGo 1.0', NULL, 'O começo: chat simples, lista de conversas e status.', NULL, 1, '{"era":"origem","nav":["Conversas","Status","Perfil"],"bg":"#0B0B1E","accent":"#5B4BD6","radius":"8px"}'),
  ('2.0.0', 'CatroGo 2.0', NULL, 'Chamadas, figurinhas e o tema espacial ganhando forma.', NULL, 2, '{"era":"cosmos","nav":["Conversas","Chamadas","Status","Perfil"],"bg":"#0A0A1C","accent":"#6C5CE7","radius":"12px"}'),
  ('3.0.0', 'CatroGo 3.0', NULL, 'Super app: vídeos, shorts, games, loja e CatCoins.', NULL, 3, '{"era":"superapp","nav":["Chat","Vídeos","Shorts","Games","Loja","Perfil"],"bg":"#09091A","accent":"#7C6BFF","radius":"16px"}'),
  ('3.4.0', 'CatroGo 3.4', NULL, 'Filmes, player próprio, premium, selos e mods versionados.', NULL, 4, '{"era":"plataforma","nav":["Chat","Filmes","Vídeos","Games","IA","Perfil"],"bg":"#08081A","accent":"#8A7BFF","radius":"18px"}'),
  ('4.0.0', 'CatroGo 4.0', '2026-09-06', 'Chegada do Ctrg UI: interface unificada, museu visual e IA que navega pelo app.', '4.0', 5, '{"era":"ctrgui","nav":["Início","Filmes","Chat","IA","Perfil"],"bg":"#070714","accent":"#8A7BFF","radius":"22px"}');

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('ctrg_ui_enabled', true, 'Novo sistema de design Ctrg UI'),
  ('ctrg_ui_pro_enabled', true, 'Experiência premium Ctrg UI Pro'),
  ('museum_enabled', true, 'Modo Museu com versões históricas navegáveis'),
  ('ai_navigation_enabled', true, 'IA pode abrir telas do app'),
  ('advanced_profile_enabled', true, 'Personalização avançada de perfil');