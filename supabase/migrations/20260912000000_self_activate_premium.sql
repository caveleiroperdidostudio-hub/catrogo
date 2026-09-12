-- RPC de auto-ativação de Premium via PIX.
-- Permite que o usuário confirme o próprio pagamento e receba o Premium
-- automaticamente, sem aprovação manual do dono.
-- O registro do pedido fica salvo para auditoria (status = 'aprovado').

CREATE OR REPLACE FUNCTION public.self_activate_premium(
  _plan text DEFAULT 'mensal',
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days integer;
  _exp timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado');
  END IF;

  _days := CASE WHEN _plan = 'anual' THEN 365 ELSE 30 END;

  -- Registra o pedido como já aprovado (auditoria)
  INSERT INTO public.premium_requests (user_id, plan, note, status, reviewed_at, reviewed_by)
  VALUES (auth.uid(), _plan, _note, 'aprovado', now(), auth.uid());

  -- Concede a assinatura
  _exp := now() + (_days || ' days')::interval;
  INSERT INTO public.premium_subscriptions (user_id, expires_at, is_gift, granted_by)
  VALUES (auth.uid(), _exp, false, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = GREATEST(COALESCE(public.premium_subscriptions.expires_at, now()), now()) + (_days || ' days')::interval,
        is_gift = false,
        granted_by = auth.uid(),
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'expires_at', _exp, 'days', _days);
END;
$$;

REVOKE ALL ON FUNCTION public.self_activate_premium(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_activate_premium(text, text) TO authenticated;
