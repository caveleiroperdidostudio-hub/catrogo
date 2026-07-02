-- ========== ROLES & OWNER ==========
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Owner is defined by a specific email
CREATE OR REPLACE FUNCTION public.is_owner(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _uid AND lower(email) = 'oio82663@gmail.com')
$$;

-- ========== GLOBAL EVENTS ==========
CREATE TABLE IF NOT EXISTS public.global_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.global_events TO anon, authenticated;
GRANT ALL ON public.global_events TO service_role;
ALTER TABLE public.global_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anyone reads events" ON public.global_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "owner inserts events" ON public.global_events FOR INSERT TO authenticated WITH CHECK (public.is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "owner updates events" ON public.global_events FOR UPDATE TO authenticated USING (public.is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_events;

-- ========== MODS ==========
CREATE TABLE IF NOT EXISTS public.mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source_code text NOT NULL DEFAULT '',
  is_exclusive boolean NOT NULL DEFAULT false,
  installs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mods TO authenticated;
GRANT SELECT ON public.mods TO anon;
GRANT ALL ON public.mods TO service_role;
ALTER TABLE public.mods ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "read public mods" ON public.mods FOR SELECT USING (NOT is_exclusive OR user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "insert own mods" ON public.mods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "update own mods" ON public.mods FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "delete own mods" ON public.mods FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_mods_updated BEFORE UPDATE ON public.mods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== MODPACKS ==========
CREATE TABLE IF NOT EXISTS public.modpacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mod_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modpacks TO authenticated;
GRANT ALL ON public.modpacks TO service_role;
ALTER TABLE public.modpacks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "manage own modpacks" ON public.modpacks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== USER MOD STATE (owned + active) ==========
CREATE TABLE IF NOT EXISTS public.user_mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mod_id uuid NOT NULL REFERENCES public.mods(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mod_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mods TO authenticated;
GRANT ALL ON public.user_mods TO service_role;
ALTER TABLE public.user_mods ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "manage own user_mods" ON public.user_mods FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== EVENT PROGRESS (missions) ==========
CREATE TABLE IF NOT EXISTS public.event_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.global_events(id) ON DELETE CASCADE,
  mission_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id, mission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_progress TO authenticated;
GRANT ALL ON public.event_progress TO service_role;
ALTER TABLE public.event_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "manage own progress" ON public.event_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== OWNER INFINITE BALANCE: skip deduction in buy RPCs ==========
CREATE OR REPLACE FUNCTION public.buy_store_item(_item_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _me uuid := auth.uid(); _price int; _active bool; _min int; _bal int; _subs int; _owner bool;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _owner := public.is_owner(_me);
  SELECT price, active, min_subscribers INTO _price, _active, _min FROM store_items WHERE id = _item_id;
  IF _price IS NULL THEN RAISE EXCEPTION 'Item inexistente'; END IF;
  IF NOT _active THEN RAISE EXCEPTION 'Item saiu da loja'; END IF;
  IF EXISTS (SELECT 1 FROM user_items WHERE user_id = _me AND item_id = _item_id) THEN RAISE EXCEPTION 'Você já possui este item'; END IF;
  IF NOT _owner THEN
    SELECT count(*) INTO _subs FROM follows WHERE following_id = _me;
    IF _subs < _min THEN RAISE EXCEPTION 'Requer % inscritos', _min; END IF;
    SELECT balance INTO _bal FROM wallets WHERE user_id = _me FOR UPDATE;
    IF _bal < _price THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
    UPDATE wallets SET balance = balance - _price WHERE user_id = _me;
    INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, -_price, 'buy_item', _item_id::text);
  END IF;
  INSERT INTO user_items (user_id, item_id) VALUES (_me, _item_id);
  RETURN jsonb_build_object('ok', true, 'balance', CASE WHEN _owner THEN 999999999 ELSE _bal - _price END);
END $function$;

CREATE OR REPLACE FUNCTION public.buy_game(_game_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _me uuid := auth.uid(); _price int; _owner_id uuid; _bal int; _owner bool;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _owner := public.is_owner(_me);
  SELECT price, user_id INTO _price, _owner_id FROM projects_games WHERE id = _game_id;
  IF _owner_id IS NULL THEN RAISE EXCEPTION 'Jogo inexistente'; END IF;
  IF _owner_id = _me THEN RAISE EXCEPTION 'Você é o criador deste jogo'; END IF;
  IF EXISTS (SELECT 1 FROM game_purchases WHERE buyer_id = _me AND game_id = _game_id) THEN RAISE EXCEPTION 'Você já comprou este jogo'; END IF;
  IF NOT _owner THEN
    SELECT balance INTO _bal FROM wallets WHERE user_id = _me FOR UPDATE;
    IF _bal < _price THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
    UPDATE wallets SET balance = balance - _price WHERE user_id = _me;
    UPDATE wallets SET balance = balance + _price WHERE user_id = _owner_id;
    INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, -_price, 'buy_game', _game_id::text), (_owner_id, _price, 'sale_game', _game_id::text);
  ELSE
    UPDATE wallets SET balance = balance + _price WHERE user_id = _owner_id;
    INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_owner_id, _price, 'sale_game', _game_id::text);
  END IF;
  INSERT INTO game_purchases (buyer_id, game_id, price) VALUES (_me, _game_id, _price);
  RETURN jsonb_build_object('ok', true, 'balance', CASE WHEN _owner THEN 999999999 ELSE _bal - _price END);
END $function$;

-- ========== EVENT MANAGEMENT RPCs ==========
CREATE OR REPLACE FUNCTION public.start_event(_kind text, _title text, _duration_seconds int)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Apenas o dono pode iniciar eventos'; END IF;
  UPDATE global_events SET active = false WHERE active = true AND kind = _kind;
  INSERT INTO global_events (kind, title, ends_at, created_by, active)
    VALUES (_kind, _title, now() + make_interval(secs => _duration_seconds), auth.uid(), true)
    RETURNING id INTO _id;
  RETURN _id;
END $function$;

CREATE OR REPLACE FUNCTION public.stop_event(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Apenas o dono pode encerrar eventos'; END IF;
  UPDATE global_events SET active = false WHERE id = _id;
END $function$;

-- Claim mission reward: grants coins and optionally the exclusive mod
CREATE OR REPLACE FUNCTION public.claim_event_reward(_event_id uuid, _mission_key text, _coins int, _grant_exclusive_mod boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _me uuid := auth.uid(); _active bool; _ends timestamptz; _modid uuid; _bal int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT active, ends_at INTO _active, _ends FROM global_events WHERE id = _event_id;
  IF _active IS NOT TRUE OR _ends < now() THEN RAISE EXCEPTION 'Evento não está ativo'; END IF;
  IF EXISTS (SELECT 1 FROM event_progress WHERE user_id = _me AND event_id = _event_id AND mission_key = _mission_key) THEN
    RAISE EXCEPTION 'Missão já concluída';
  END IF;
  INSERT INTO event_progress (user_id, event_id, mission_key) VALUES (_me, _event_id, _mission_key);
  IF _coins > 0 THEN
    UPDATE wallets SET balance = balance + _coins WHERE user_id = _me;
    INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, _coins, 'reward', _mission_key);
  END IF;
  IF _grant_exclusive_mod THEN
    SELECT id INTO _modid FROM mods WHERE is_exclusive = true ORDER BY created_at LIMIT 1;
    IF _modid IS NOT NULL THEN
      INSERT INTO user_mods (user_id, mod_id, active) VALUES (_me, _modid, true) ON CONFLICT (user_id, mod_id) DO NOTHING;
    END IF;
  END IF;
  SELECT balance INTO _bal FROM wallets WHERE user_id = _me;
  RETURN jsonb_build_object('ok', true, 'balance', _bal);
END $function$;

-- Seed the exclusive Christmas mod (system-owned, no user_id)
INSERT INTO public.mods (user_id, title, description, source_code, is_exclusive)
SELECT NULL, 'Mod Exclusivo de Natal 🎄', 'Mod raro liberado apenas durante o Evento de Natal. Adiciona neve cósmica e brilhos festivos à interface.',
'// Mod Exclusivo de Natal\n// Ativa efeitos de neve e tema festivo\nefeito neve intensidade 3\ntema festivo dourado', true
WHERE NOT EXISTS (SELECT 1 FROM public.mods WHERE is_exclusive = true);