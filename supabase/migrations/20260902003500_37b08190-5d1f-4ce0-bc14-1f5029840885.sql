REVOKE ALL ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_premium(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_premium(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_premium_request(uuid, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_premium(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_premium(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_premium_request(uuid, boolean, integer) TO authenticated;