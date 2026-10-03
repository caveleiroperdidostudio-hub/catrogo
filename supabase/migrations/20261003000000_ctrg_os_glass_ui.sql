-- ============ Ctrg OS 4.1 — tema Glass UI e nomenclatura ============
-- Registra a versão 4.1 das duas experiências (gratuita e paga) e o
-- interruptor do tema Glass UI, exclusivo do Ctrg OS.

INSERT INTO public.ui_versions (name, ui_version, app_version, kind, description, status, theme, available)
VALUES
  ('Ctrg UI 4.1', '4.1', '4.1.0', 'standard',
   'Interface gratuita: mais limpa, com personalização e informações do app em Perfil → Configurações.',
   'current', '{"skins": ["cosmos"]}'::jsonb, true),
  ('Ctrg OS 4.1', '4.1', '4.1.0', 'pro',
   'Experiência paga: tema Glass UI no estilo do iPhone, efeitos e animações exclusivas.',
   'current', '{"skins": ["cosmos", "glass"]}'::jsonb, true)
ON CONFLICT (ui_version, kind) DO UPDATE
  SET name = EXCLUDED.name,
      app_version = EXCLUDED.app_version,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      theme = EXCLUDED.theme,
      updated_at = now();

-- Mantém as versões anteriores marcadas como histórico, exceto a 4.1.
UPDATE public.ui_versions SET status = 'legacy' WHERE ui_version <> '4.1' AND status = 'current';

INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('ctrg_os_enabled', true, 'Ctrg OS (experiência paga) disponível'),
  ('glass_ui_enabled', true, 'Tema Glass UI exclusivo do Ctrg OS')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.museum_versions (app_version, label, released_at, summary, ui_version, playable, sort_order)
VALUES
  ('4.1.0', 'CatroGo 4.1', '2026-10-03', 'Ctrg OS: tema Glass UI e Pix automático com QR Code', '4.1', true, -1)
ON CONFLICT (app_version) DO NOTHING;
