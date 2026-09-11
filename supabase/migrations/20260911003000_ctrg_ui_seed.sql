-- ============ CTRG UI — Seed de versões e dados ============

-- Versões da interface Ctrg UI
INSERT INTO public.ui_versions (name, ui_version, app_version, kind, description, status, theme, available)
VALUES
  ('Ctrg UI 1.0', '1.0', '1.0.0', 'standard', 'Interface inicial do CatroGo — chat, vídeos e loja.', 'legacy', '{}', true),
  ('Ctrg UI 2.0', '2.0', '2.0.0', 'standard', 'Mods, modpacks e eventos globais.', 'legacy', '{}', true),
  ('Ctrg UI 3.0', '3.0', '3.0.0', 'standard', 'Hiper atualização: IA, chamadas e painel de design.', 'legacy', '{}', true),
  ('Ctrg UI 3.4', '3.4', '3.4.0', 'standard', 'Chat completo: criptografia, anexos e figurinhas.', 'legacy', '{}', true),
  ('Ctrg UI 4.0', '4.0', '4.0.0', 'standard', 'Novo sistema de design Ctrg UI, Museu, IA com navegação.', 'current', '{}', true),
  ('Ctrg UI Pro 4.0', '4.0', '4.0.0', 'pro', 'Experiência premium: efeitos visuais, animações e skins exclusivas.', 'current', '{}', true)
ON CONFLICT (ui_version, kind) DO NOTHING;

-- Versões do Museu
INSERT INTO public.museum_versions (app_version, label, released_at, summary, ui_version, playable, sort_order)
VALUES
  ('4.0.0', 'CatroGo 4.0', '2026-09-06', 'Ctrg UI: novo sistema de design, Museu, IA com navegação', '4.0', true, 0),
  ('3.4.0', 'CatroGo 3.4', '2026-09-01', 'Chat completo: criptografia, anexos e figurinhas', NULL, true, 1),
  ('3.0.0', 'CatroGo 3.0', '2026-07-15', 'Hiper atualização: IA, chamadas e painel de design', NULL, true, 2),
  ('2.0.0', 'CatroGo 2.0', '2026-07-01', 'Mods, modpacks e eventos globais', NULL, true, 3),
  ('1.0.0', 'CatroGo 1.0', '2026-06-01', 'Lançamento: chat, vídeos, shorts, games e loja', NULL, true, 4)
ON CONFLICT (app_version) DO NOTHING;

-- Feature flags
INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('ctrg_ui_enabled', true, 'Sistema de design Ctrg UI ativo'),
  ('ctrg_ui_pro_enabled', true, 'Variante Ctrg UI Pro disponível'),
  ('museum_enabled', true, 'Modo Museu ativo'),
  ('ai_navigation_enabled', true, 'IA pode navegar pelo aplicativo'),
  ('advanced_profile_enabled', true, 'Personalização avançada de perfil')
ON CONFLICT (key) DO NOTHING;
