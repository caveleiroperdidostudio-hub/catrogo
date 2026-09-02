CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  expires_at timestamptz,
  is_gift boolean not null default false,
  granted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.premium_subscriptions TO authenticated;
GRANT ALL ON public.premium_subscriptions TO service_role;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own premium" ON public.premium_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner());

CREATE TABLE IF NOT EXISTS public.premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'mensal',
  pix_key_used text,
  receipt_path text,
  note text,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT, INSERT ON public.premium_requests TO authenticated;
GRANT ALL ON public.premium_requests TO service_role;
ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests select" ON public.premium_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner());
CREATE POLICY "own requests insert" ON public.premium_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pendente');

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid default auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.premium_subscriptions s
    WHERE s.user_id = _user_id AND (s.expires_at IS NULL OR s.expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION public.is_premium(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_premium(_username text, _days integer default null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid; exp timestamptz;
BEGIN
  IF NOT public.is_owner() THEN RETURN jsonb_build_object('ok', false, 'error', 'Apenas o dono pode dar premium'); END IF;
  SELECT id INTO target FROM public.profiles WHERE lower(username) = lower(trim(_username));
  IF target IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Usuário não encontrado'); END IF;
  exp := CASE WHEN _days IS NULL THEN NULL ELSE now() + (_days || ' days')::interval END;
  INSERT INTO public.premium_subscriptions (user_id, expires_at, is_gift, granted_by)
  VALUES (target, exp, true, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET expires_at = exp, is_gift = true, granted_by = auth.uid(), updated_at = now();
  RETURN jsonb_build_object('ok', true, 'user_id', target, 'expires_at', exp);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_premium(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_premium(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_premium(_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  IF NOT public.is_owner() THEN RETURN jsonb_build_object('ok', false, 'error', 'Apenas o dono pode remover premium'); END IF;
  SELECT id INTO target FROM public.profiles WHERE lower(username) = lower(trim(_username));
  IF target IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Usuário não encontrado'); END IF;
  DELETE FROM public.premium_subscriptions WHERE user_id = target;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_premium(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_premium(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_premium_request(_id uuid, _approve boolean, _days integer default 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.premium_requests;
BEGIN
  IF NOT public.is_owner() THEN RETURN jsonb_build_object('ok', false, 'error', 'Apenas o dono pode revisar'); END IF;
  SELECT * INTO req FROM public.premium_requests WHERE id = _id;
  IF req.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Pedido não encontrado'); END IF;
  UPDATE public.premium_requests
    SET status = CASE WHEN _approve THEN 'aprovado' ELSE 'recusado' END,
        reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _id;
  IF _approve THEN
    INSERT INTO public.premium_subscriptions (user_id, expires_at, is_gift, granted_by)
    VALUES (req.user_id, now() + (_days || ' days')::interval, false, auth.uid())
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at = GREATEST(COALESCE(public.premium_subscriptions.expires_at, now()), now()) + (_days || ' days')::interval,
          is_gift = false, granted_by = auth.uid(), updated_at = now();
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.review_premium_request(uuid, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_premium_request(uuid, boolean, integer) TO authenticated;