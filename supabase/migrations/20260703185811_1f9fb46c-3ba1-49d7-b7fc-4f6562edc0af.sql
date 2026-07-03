CREATE OR REPLACE FUNCTION public.admin_give_hype(_username text, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _target uuid; _bal int; _uname text;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Apenas o dono pode usar este comando'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

  SELECT id, username INTO _target, _uname
  FROM profiles
  WHERE lower(username) = lower(_username) OR lower(display_name) = lower(_username)
  ORDER BY (lower(username) = lower(_username)) DESC
  LIMIT 1;

  IF _target IS NULL THEN RAISE EXCEPTION 'Usuário "%" não encontrado', _username; END IF;

  UPDATE wallets SET balance = balance + _amount WHERE user_id = _target;
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (_target, _amount);
  END IF;

  INSERT INTO coin_transactions (user_id, amount, kind, reference)
    VALUES (_target, _amount, 'admin_grant', 'admin_give_hype');

  SELECT balance INTO _bal FROM wallets WHERE user_id = _target;
  RETURN jsonb_build_object('ok', true, 'username', _uname, 'balance', _bal);
END $function$;

REVOKE EXECUTE ON FUNCTION public.admin_give_hype(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_give_hype(text, integer) TO authenticated;
