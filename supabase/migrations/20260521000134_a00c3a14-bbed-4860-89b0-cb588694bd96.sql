
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('status-media', 'status-media', true) on conflict (id) do nothing;

-- Avatars: public read, user can write own folder (folder = user id)
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Status media: public read, user writes own folder
create policy "Status media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'status-media');

create policy "Users upload own status media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'status-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own status media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'status-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Add media_type column to statuses (image/video) if not exists
alter table public.statuses add column if not exists media_type text;
