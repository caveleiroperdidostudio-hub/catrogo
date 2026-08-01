CREATE OR REPLACE FUNCTION public.notify_follow(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text;
BEGIN
  IF auth.uid() IS NULL OR _target = auth.uid() THEN RETURN; END IF;
  SELECT COALESCE(display_name, username, 'Alguém') INTO actor FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.notifications (user_id, type, title, body, icon)
  VALUES (_target, 'follow', 'Novo inscrito', actor || ' começou a seguir seu canal.', '👥');
END; $$;

CREATE OR REPLACE FUNCTION public.notify_hype(_target uuid, _amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text;
BEGIN
  IF auth.uid() IS NULL OR _target = auth.uid() OR _amount <= 0 THEN RETURN; END IF;
  SELECT COALESCE(display_name, username, 'Alguém') INTO actor FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.notifications (user_id, type, title, body, icon)
  VALUES (_target, 'hype', 'Você recebeu hype!', actor || ' enviou ' || _amount || ' CatCoins de hype.', '⚡');
END; $$;

CREATE OR REPLACE FUNCTION public.notify_message(_conversation_id uuid, _preview text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conversation_id AND user_id = auth.uid()) THEN RETURN; END IF;
  SELECT COALESCE(display_name, username, 'Alguém') INTO actor FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.notifications (user_id, type, title, body, icon, link)
  SELECT cm.user_id, 'message', actor, left(COALESCE(_preview, ''), 140), '💬', '/'
  FROM public.conversation_members cm
  WHERE cm.conversation_id = _conversation_id AND cm.user_id <> auth.uid();
END; $$;

REVOKE ALL ON FUNCTION public.notify_follow(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_hype(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_follow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_hype(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_message(uuid, text) TO authenticated;