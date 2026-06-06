-- ============ SECURITY FIXES ============

-- 1) conversation_members: only allow removing yourself
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_members;
CREATE POLICY "Users can leave conversations"
ON public.conversation_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 2) profiles: hide phone column from broad SELECT (column-level grants)
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, display_name, avatar_url, about, created_at, updated_at) ON public.profiles TO authenticated;

-- ============ ECONOMY SCHEMA ============

CREATE TABLE public.wallets (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.coin_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.store_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'badge',
  rarity text NOT NULL DEFAULT 'comum',
  price integer NOT NULL DEFAULT 50,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_subscribers integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_items TO authenticated;
GRANT ALL ON public.store_items TO service_role;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store items viewable by authenticated" ON public.store_items FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, UPDATE ON public.user_items TO authenticated;
GRANT ALL ON public.user_items TO service_role;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own items" ON public.user_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Inventory viewable for equipped" ON public.user_items FOR SELECT TO authenticated USING (equipped = true);
CREATE POLICY "Users update own items" ON public.user_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.game_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.projects_games(id) ON DELETE CASCADE,
  price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, game_id)
);
GRANT SELECT ON public.game_purchases TO authenticated;
GRANT ALL ON public.game_purchases TO service_role;
ALTER TABLE public.game_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases" ON public.game_purchases FOR SELECT TO authenticated USING (buyer_id = auth.uid());

ALTER TABLE public.projects_games ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0;

-- ============ WALLET BOOTSTRAP ============

CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_profile_created_wallet
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ECONOMY RPCs ============

CREATE OR REPLACE FUNCTION public.buy_store_item(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _price int; _active bool; _min int; _bal int; _subs int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT price, active, min_subscribers INTO _price, _active, _min FROM store_items WHERE id = _item_id;
  IF _price IS NULL THEN RAISE EXCEPTION 'Item inexistente'; END IF;
  IF NOT _active THEN RAISE EXCEPTION 'Item saiu da loja'; END IF;
  IF EXISTS (SELECT 1 FROM user_items WHERE user_id = _me AND item_id = _item_id) THEN RAISE EXCEPTION 'Você já possui este item'; END IF;
  SELECT count(*) INTO _subs FROM follows WHERE following_id = _me;
  IF _subs < _min THEN RAISE EXCEPTION 'Requer % inscritos', _min; END IF;
  SELECT balance INTO _bal FROM wallets WHERE user_id = _me FOR UPDATE;
  IF _bal < _price THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE wallets SET balance = balance - _price WHERE user_id = _me;
  INSERT INTO user_items (user_id, item_id) VALUES (_me, _item_id);
  INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, -_price, 'buy_item', _item_id::text);
  RETURN jsonb_build_object('ok', true, 'balance', _bal - _price);
END $$;

CREATE OR REPLACE FUNCTION public.buy_game(_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _price int; _owner uuid; _bal int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT price, user_id INTO _price, _owner FROM projects_games WHERE id = _game_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Jogo inexistente'; END IF;
  IF _owner = _me THEN RAISE EXCEPTION 'Você é o criador deste jogo'; END IF;
  IF EXISTS (SELECT 1 FROM game_purchases WHERE buyer_id = _me AND game_id = _game_id) THEN RAISE EXCEPTION 'Você já comprou este jogo'; END IF;
  SELECT balance INTO _bal FROM wallets WHERE user_id = _me FOR UPDATE;
  IF _bal < _price THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE wallets SET balance = balance - _price WHERE user_id = _me;
  UPDATE wallets SET balance = balance + _price WHERE user_id = _owner;
  INSERT INTO game_purchases (buyer_id, game_id, price) VALUES (_me, _game_id, _price);
  INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, -_price, 'buy_game', _game_id::text), (_owner, _price, 'sale_game', _game_id::text);
  RETURN jsonb_build_object('ok', true, 'balance', _bal - _price);
END $$;

CREATE OR REPLACE FUNCTION public.send_hype(_video_id uuid, _amount int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _owner uuid; _bal int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount NOT IN (5, 10, 50) THEN RAISE EXCEPTION 'Valor de hype inválido'; END IF;
  SELECT user_id INTO _owner FROM posts_video WHERE id = _video_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Vídeo inexistente'; END IF;
  IF _owner = _me THEN RAISE EXCEPTION 'Você não pode dar hype no próprio vídeo'; END IF;
  SELECT balance INTO _bal FROM wallets WHERE user_id = _me FOR UPDATE;
  IF _bal < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE wallets SET balance = balance - _amount WHERE user_id = _me;
  UPDATE wallets SET balance = balance + _amount WHERE user_id = _owner;
  INSERT INTO interactions (user_id, target_type, target_id, kind, content) VALUES (_me, 'video', _video_id, 'hype', _amount::text);
  INSERT INTO coin_transactions (user_id, amount, kind, reference) VALUES (_me, -_amount, 'hype_sent', _video_id::text), (_owner, _amount, 'hype_received', _video_id::text);
  RETURN jsonb_build_object('ok', true, 'balance', _bal - _amount);
END $$;