-- ============ RBAC ============
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions readable by staff" ON public.permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.permissions(key, description) VALUES
 ('users.view','Ver usuários'),('users.edit','Editar usuários'),('users.ban','Banir usuários'),
 ('movies.publish','Publicar/aprovar filmes'),('movies.delete','Excluir filmes'),
 ('verification.review','Analisar verificações'),('mods.review','Moderar mods'),('mods.publish','Publicar mods'),
 ('ai.configure','Configurar provedores de IA'),('reports.review','Analisar denúncias'),
 ('audit.view','Ver auditoria'),('system.settings','Configurações do sistema'),('admin.manage','Gerenciar administradores');

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions readable by staff" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.role_permissions(role, permission)
SELECT 'admin'::app_role, key FROM public.permissions WHERE key IN ('users.view','movies.publish','verification.review','mods.review','reports.review','audit.view');
INSERT INTO public.role_permissions(role, permission)
SELECT 'moderator'::app_role, key FROM public.permissions WHERE key IN ('users.view','reports.review','mods.review');

CREATE OR REPLACE FUNCTION public.has_permission(_perm text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_owner(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission = _perm
  )
$$;
REVOKE ALL ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_role_permission(_role app_role, _permission text, _enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner() THEN RETURN jsonb_build_object('ok', false, 'error', 'Apenas o dono'); END IF;
  IF _enabled THEN
    INSERT INTO public.role_permissions(role, permission) VALUES (_role, _permission) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.role_permissions WHERE role = _role AND permission = _permission;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.set_role_permission(app_role, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_role_permission(app_role, text, boolean) TO authenticated;

-- ============ VERIFICAÇÃO / BADGES ============
CREATE TABLE public.verification_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '✓',
  color text NOT NULL DEFAULT '#8b5cf6',
  requirements text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verification_types TO authenticated, anon;
GRANT ALL ON public.verification_types TO service_role;
ALTER TABLE public.verification_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verification types public read" ON public.verification_types FOR SELECT USING (true);

INSERT INTO public.verification_types(key, label, icon, color, requirements) VALUES
 ('creator','Criador de conteúdo','🎬','#a78bfa','Canal ativo com publicações originais'),
 ('developer','Desenvolvedor','💻','#38bdf8','Jogos ou mods publicados'),
 ('artist','Artista','🎨','#f472b6','Portfólio público de obras próprias'),
 ('filmmaker','Cineasta','🎥','#fbbf24','Filmes/curtas próprios ou licenciados'),
 ('gamer','Gamer','🎮','#34d399','Presença ativa na comunidade de jogos'),
 ('educator','Educador','📚','#60a5fa','Conteúdo educativo comprovado'),
 ('community','Comunidade','🌌','#c084fc','Grupo ou comunidade reconhecida'),
 ('company','Empresa/Projeto','🏢','#94a3b8','Documento ou site oficial do projeto'),
 ('partner','Parceiro','🤝','#f59e0b','Parceria formal com o CatroGo'),
 ('moderator','Moderador','🛡️','#22d3ee','Indicação da equipe');

CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_key text NOT NULL REFERENCES public.verification_types(key),
  full_name text NOT NULL,
  about text NOT NULL DEFAULT '',
  links text[] NOT NULL DEFAULT '{}',
  evidence_url text,
  status text NOT NULL DEFAULT 'pendente',
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own verification requests" ON public.verification_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission('verification.review'));
CREATE POLICY "create own verification request" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pendente');
CREATE TRIGGER verification_requests_updated_at BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status, created_at DESC);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_key text NOT NULL REFERENCES public.verification_types(key),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type_key)
);
GRANT SELECT ON public.user_badges TO authenticated, anon;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges public read" ON public.user_badges FOR SELECT USING (true);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

CREATE OR REPLACE FUNCTION public.review_verification(_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.verification_requests;
BEGIN
  IF NOT public.has_permission('verification.review') THEN RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão'); END IF;
  SELECT * INTO req FROM public.verification_requests WHERE id = _id;
  IF req.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Pedido não encontrado'); END IF;
  UPDATE public.verification_requests
    SET status = CASE WHEN _approve THEN 'aprovado' ELSE 'rejeitado' END,
        reject_reason = CASE WHEN _approve THEN NULL ELSE _reason END,
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _id;
  IF _approve THEN
    INSERT INTO public.user_badges(user_id, type_key, granted_by) VALUES (req.user_id, req.type_key, auth.uid())
      ON CONFLICT (user_id, type_key) DO NOTHING;
    INSERT INTO public.notifications(user_id, type, title, body, icon)
      VALUES (req.user_id, 'system', 'Verificação aprovada', 'Seu selo já aparece no perfil.', '✅');
  ELSE
    INSERT INTO public.notifications(user_id, type, title, body, icon)
      VALUES (req.user_id, 'system', 'Verificação recusada', coalesce(_reason, 'Sem motivo informado'), '⚠️');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.review_verification(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_verification(uuid, boolean, text) TO authenticated;

-- ============ AUDITORIA ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  result text NOT NULL DEFAULT 'ok',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit readable with permission" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_permission('audit.view'));
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _resource_type text, _resource_id text DEFAULT NULL, _result text DEFAULT 'ok', _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.audit_logs(actor_id, action, resource_type, resource_id, result, metadata)
  VALUES (auth.uid(), left(_action,80), left(_resource_type,40), left(coalesce(_resource_id,''),80), left(_result,20), _metadata);
END $$;
REVOKE ALL ON FUNCTION public.log_audit(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, text, jsonb) TO authenticated;

-- ============ DENÚNCIAS ============
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'aberto',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports own or moderation" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_permission('reports.review'));
CREATE POLICY "create own report" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'aberto');
CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.resolve_report(_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('reports.review') THEN RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão'); END IF;
  IF _status NOT IN ('resolvido','descartado') THEN RETURN jsonb_build_object('ok', false, 'error', 'Status inválido'); END IF;
  UPDATE public.reports SET status = _status, resolved_by = auth.uid(), resolved_at = now() WHERE id = _id;
  PERFORM public.log_audit('report.' || _status, 'report', _id::text);
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.resolve_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, text) TO authenticated;

-- ============ PROVEDORES DE IA ============
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  base_url text NOT NULL,
  model text NOT NULL,
  secret_name text,
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  timeout_ms integer NOT NULL DEFAULT 30000,
  user_daily_limit integer NOT NULL DEFAULT 100,
  global_daily_limit integer NOT NULL DEFAULT 5000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_providers TO authenticated;
GRANT ALL ON public.ai_providers TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai providers read with permission" ON public.ai_providers FOR SELECT TO authenticated USING (public.has_permission('ai.configure'));
CREATE TRIGGER ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_providers(name, slug, base_url, model, secret_name, priority) VALUES
 ('Lovable AI Gateway','lovable','https://ai.gateway.lovable.dev/v1','google/gemini-2.5-flash','LOVABLE_API_KEY',10),
 ('OpenAI','openai','https://api.openai.com/v1','gpt-4o-mini','OPENAI_API_KEY',20);

CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  provider_slug text NOT NULL,
  model text NOT NULL,
  feature text NOT NULL DEFAULT 'chat',
  tokens integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai usage own or admin" ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission('ai.configure'));
CREATE INDEX idx_ai_usage_user_day ON public.ai_usage(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_ai_provider(_slug text, _enabled boolean DEFAULT NULL, _model text DEFAULT NULL, _priority integer DEFAULT NULL, _user_daily_limit integer DEFAULT NULL, _global_daily_limit integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('ai.configure') THEN RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão'); END IF;
  UPDATE public.ai_providers SET
    enabled = coalesce(_enabled, enabled),
    model = coalesce(_model, model),
    priority = coalesce(_priority, priority),
    user_daily_limit = coalesce(_user_daily_limit, user_daily_limit),
    global_daily_limit = coalesce(_global_daily_limit, global_daily_limit)
  WHERE slug = _slug;
  PERFORM public.log_audit('ai.provider.update', 'ai_provider', _slug);
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.update_ai_provider(text, boolean, text, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_ai_provider(text, boolean, text, integer, integer, integer) TO authenticated;

-- ============ FILMES: metadados + aprovação ============
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS original_title text,
  ADD COLUMN IF NOT EXISTS age_rating text,
  ADD COLUMN IF NOT EXISTS genres text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cast_names text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS director text,
  ADD COLUMN IF NOT EXISTS trailer_url text,
  ADD COLUMN IF NOT EXISTS rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado';

CREATE INDEX IF NOT EXISTS idx_movies_status ON public.movies(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.review_movie(_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('movies.publish') THEN RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão'); END IF;
  UPDATE public.movies SET status = CASE WHEN _approve THEN 'publicado' ELSE 'rejeitado' END WHERE id = _id;
  PERFORM public.log_audit(CASE WHEN _approve THEN 'movie.approve' ELSE 'movie.reject' END, 'movie', _id::text);
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.review_movie(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_movie(uuid, boolean) TO authenticated;

-- ============ MODS: versões ============
CREATE TABLE public.mod_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mod_id uuid NOT NULL REFERENCES public.mods(id) ON DELETE CASCADE,
  version integer NOT NULL,
  source_code text NOT NULL,
  changelog text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mod_id, version)
);
GRANT SELECT, INSERT ON public.mod_versions TO authenticated;
GRANT ALL ON public.mod_versions TO service_role;
ALTER TABLE public.mod_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod versions owner or staff" ON public.mod_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mods m WHERE m.id = mod_id AND (m.user_id = auth.uid() OR public.has_permission('mods.review'))));
CREATE POLICY "mod versions insert by owner" ON public.mod_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.mods m WHERE m.id = mod_id AND m.user_id = auth.uid()));

ALTER TABLE public.mods
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.rollback_mod(_mod_id uuid, _version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _src text; _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.mods WHERE id = _mod_id;
  IF _owner IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Mod inexistente'); END IF;
  IF _owner <> auth.uid() AND NOT public.has_permission('mods.review') THEN RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão'); END IF;
  SELECT source_code INTO _src FROM public.mod_versions WHERE mod_id = _mod_id AND version = _version;
  IF _src IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Versão não encontrada'); END IF;
  UPDATE public.mods SET source_code = _src, current_version = _version WHERE id = _mod_id;
  PERFORM public.log_audit('mod.rollback', 'mod', _mod_id::text);
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.rollback_mod(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_mod(uuid, integer) TO authenticated;