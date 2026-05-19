REVOKE ALL ON FUNCTION public.start_dm(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_group(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_dm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group(text, uuid[]) TO authenticated;