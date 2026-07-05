
-- 1) Event reward integrity: server-defined mission rewards
CREATE TABLE IF NOT EXISTS public.event_missions (
  mission_key text PRIMARY KEY,
  coins integer NOT NULL DEFAULT 0,
  grants_mod boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_missions TO authenticated, anon;
GRANT ALL ON public.event_missions TO service_role;
ALTER TABLE public.event_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Event missions readable" ON public.event_missions;
CREATE POLICY "Event missions readable" ON public.event_missions FOR SELECT USING (true);

INSERT INTO public.event_missions (mission_key, coins, grants_mod) VALUES
  ('xmas_welcome', 100, false),
  ('xmas_share', 150, false),
  ('xmas_explorer', 200, false),
  ('xmas_exclusive', 0, true),
  ('xmas_premium', 250, false)
ON CONFLICT (mission_key) DO UPDATE SET coins = EXCLUDED.coins, grants_mod = EXCLUDED.grants_mod;

DROP FUNCTION IF EXISTS public.claim_event_reward(uuid, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.claim_event_reward(_event_id uuid, _mission_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _me uuid := auth.uid(); _active bool; _ends timestamptz; _coins int; _grants bool; _modid uuid; _bal int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT coins, grants_mod INTO _coins, _grants FROM event_missions WHERE mission_key = _mission_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missão inválida'; END IF;
  SELECT active, ends_at INTO _active, _ends FROM global_events WHERE id = _event_id;
  IF _active IS NOT TRUE OR _ends < now() THEN RAISE EXCEPTION 'Evento não está ativo'; END IF;
  IF EXISTS (SELECT 1 FROM event_progress WHERE user_id = _me AND event_id = _event_id AND mission_key = _mission_key) THEN
    RAISE EXCEPTION 'Missão já concluída';
  END IF;
  INSERT INTO event_progress (user_id, event_id, mission_key) VALUES (_me, _event_id, _mission_key);
  IF _coins <> 0 THEN
    UPDATE wallets SET balance = balance + _coins WHERE user_id = _me;
    INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, _coins, 'reward', _mission_key);
  END IF;
  IF _grants THEN
    SELECT id INTO _modid FROM mods WHERE is_exclusive = true ORDER BY created_at LIMIT 1;
    IF _modid IS NOT NULL THEN
      INSERT INTO user_mods (user_id, mod_id, active) VALUES (_me, _modid, true) ON CONFLICT (user_id, mod_id) DO NOTHING;
    END IF;
  END IF;
  SELECT balance INTO _bal FROM wallets WHERE user_id = _me;
  RETURN jsonb_build_object('ok', true, 'balance', _bal);
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_event_reward(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_event_reward(uuid, text) TO authenticated;

-- 2) Profiles: hide phone from other users via column-level privileges
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, about, created_at, updated_at) ON public.profiles TO authenticated;

-- 3) user_items: remove universal read of equipped items
DROP POLICY IF EXISTS "Inventory viewable for equipped" ON public.user_items;

-- 4) mods: publish flag; drafts private to author
ALTER TABLE public.mods ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS "read public mods" ON public.mods;
CREATE POLICY "read public mods" ON public.mods FOR SELECT
  USING ((is_published AND NOT is_exclusive) OR user_id = auth.uid());

-- 5) projects_games: protect source_code of paid games
REVOKE SELECT ON public.projects_games FROM authenticated;
REVOKE SELECT ON public.projects_games FROM anon;
GRANT SELECT (id, user_id, title, description, plays, price, created_at, updated_at) ON public.projects_games TO authenticated;

CREATE OR REPLACE FUNCTION public.get_game_source(_game_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _me uuid := auth.uid(); _price int; _owner uuid; _src text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT price, user_id, source_code INTO _price, _owner, _src FROM projects_games WHERE id = _game_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Jogo inexistente'; END IF;
  IF _price = 0 OR _owner = _me OR public.is_owner(_me)
     OR EXISTS (SELECT 1 FROM game_purchases WHERE game_id = _game_id AND buyer_id = _me) THEN
    RETURN _src;
  END IF;
  RAISE EXCEPTION 'Você precisa comprar este jogo';
END $$;
REVOKE EXECUTE ON FUNCTION public.get_game_source(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_game_source(uuid) TO authenticated;
