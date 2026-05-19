
drop policy if exists "Users can join conversations" on public.conversation_members;
create policy "Users can join conversations" on public.conversation_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists(select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_conversation_last_message() from public, anon, authenticated;
revoke execute on function public.is_member(uuid, uuid) from public, anon;
