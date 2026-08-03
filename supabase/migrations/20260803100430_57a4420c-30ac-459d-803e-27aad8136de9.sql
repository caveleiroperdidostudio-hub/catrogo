ALTER TABLE public.projects_games
  ADD COLUMN IF NOT EXISTS engine text NOT NULL DEFAULT 'newcatroid',
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

ALTER TABLE public.projects_games
  ADD CONSTRAINT projects_games_engine_check CHECK (engine IN ('newcatroid','html'));

DROP POLICY IF EXISTS "Games are viewable by everyone" ON public.projects_games;
DROP POLICY IF EXISTS "Anyone can view games" ON public.projects_games;
DROP POLICY IF EXISTS "Published games are viewable" ON public.projects_games;

CREATE POLICY "Published games are viewable"
ON public.projects_games FOR SELECT TO authenticated
USING (published = true OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.spend_coins(_amount int, _kind text, _reference text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _me uuid := auth.uid(); _bal int; _is_owner bool;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _kind NOT IN ('export_game','publish_game','import_game') THEN RAISE EXCEPTION 'Operação inválida'; END IF;
  _is_owner := public.is_owner(_me);
  IF _is_owner THEN
    RETURN jsonb_build_object('ok', true, 'balance', 999999999);
  END IF;
  SELECT balance INTO _bal FROM wallets WHERE user_id = _me FOR UPDATE;
  IF _bal IS NULL THEN RAISE EXCEPTION 'Carteira inexistente'; END IF;
  IF _bal < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE wallets SET balance = balance - _amount WHERE user_id = _me;
  INSERT INTO coin_transactions (user_id, amount, kind, reference)
  VALUES (_me, -_amount, _kind, _reference);
  RETURN jsonb_build_object('ok', true, 'balance', _bal - _amount);
END $function$;

REVOKE EXECUTE ON FUNCTION public.spend_coins(int, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spend_coins(int, text, text) TO authenticated;