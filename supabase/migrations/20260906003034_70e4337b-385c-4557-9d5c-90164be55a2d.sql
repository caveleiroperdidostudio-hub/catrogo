REVOKE EXECUTE ON FUNCTION public.current_ui_version(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_ui_version(uuid) TO authenticated;