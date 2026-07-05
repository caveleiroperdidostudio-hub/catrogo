-- 1. Restrict conversation metadata updates to admins only
DROP POLICY IF EXISTS "Members can update their conversations" ON public.conversations;
CREATE POLICY "Admins can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_members m
  WHERE m.conversation_id = id AND m.user_id = auth.uid() AND m.is_admin
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversation_members m
  WHERE m.conversation_id = id AND m.user_id = auth.uid() AND m.is_admin
));

-- 2. Ensure paid game source_code is never selectable directly (only via get_game_source RPC)
REVOKE SELECT (source_code) ON public.projects_games FROM authenticated;
REVOKE SELECT (source_code) ON public.projects_games FROM anon;

-- 3. Revoke anon/public EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.assign_app_phone() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_app_phone() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_event_reward(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_game_source(uuid) FROM anon, public;

-- Preserve intended access for signed-in users
GRANT EXECUTE ON FUNCTION public.assign_app_phone() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_reward(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_source(uuid) TO authenticated;