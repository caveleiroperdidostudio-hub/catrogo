-- 1. Prevent public listing of public buckets: drop broad SELECT policies.
-- Public file access via public URL still works (public buckets bypass RLS for object serving).
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Status media is publicly readable" ON storage.objects;

-- 2. status-media: add owner-scoped UPDATE policy (mirrors DELETE) so users can only overwrite their own objects.
CREATE POLICY "Users update own status media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'status-media' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'status-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Lock down SECURITY DEFINER functions from anonymous execution.
REVOKE EXECUTE ON FUNCTION public.buy_game(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.buy_store_item(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_event_reward(uuid, text, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_hype(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_event(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.stop_event(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon;

-- Trigger-only functions must never be callable directly by anon or authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_wallet() FROM anon, authenticated;
