-- Remove PUBLIC (which includes anon) execute; authenticated keeps its explicit grant.
REVOKE EXECUTE ON FUNCTION public.buy_game(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buy_store_item(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_event_reward(uuid, text, integer, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_hype(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_event(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.stop_event(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_wallet() FROM PUBLIC;
