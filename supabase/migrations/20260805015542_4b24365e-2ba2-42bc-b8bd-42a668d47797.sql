-- =============== A. ADMIN HIERARCHY ===============
create or replace function public.is_staff(_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner(_uid) or exists (
    select 1 from public.user_roles ur where ur.user_id = _uid and ur.role = 'admin'
  )
$$;
revoke all on function public.is_staff(uuid) from anon;
grant execute on function public.is_staff(uuid) to authenticated, service_role;

create or replace function public.grant_admin(_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  if not public.is_owner(auth.uid()) then return jsonb_build_object('ok', false, 'error', 'apenas o dono'); end if;
  select id into _uid from public.profiles where lower(username) = lower(_username) limit 1;
  if _uid is null then return jsonb_build_object('ok', false, 'error', 'usuário não encontrado'); end if;
  insert into public.user_roles(user_id, role) values (_uid, 'admin') on conflict do nothing;
  return jsonb_build_object('ok', true, 'user_id', _uid);
end $$;
revoke all on function public.grant_admin(text) from anon;
grant execute on function public.grant_admin(text) to authenticated;

create or replace function public.revoke_admin(_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  if not public.is_owner(auth.uid()) then return jsonb_build_object('ok', false, 'error', 'apenas o dono'); end if;
  select id into _uid from public.profiles where lower(username) = lower(_username) limit 1;
  if _uid is null then return jsonb_build_object('ok', false, 'error', 'usuário não encontrado'); end if;
  delete from public.user_roles where user_id = _uid and role = 'admin';
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.revoke_admin(text) from anon;
grant execute on function public.revoke_admin(text) to authenticated;

create or replace function public.list_staff()
returns table(user_id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.user_roles r join public.profiles p on p.id = r.user_id
  where r.role = 'admin' and public.is_staff(auth.uid())
$$;
revoke all on function public.list_staff() from anon;
grant execute on function public.list_staff() to authenticated;

-- =============== B. FILMES ===============
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  poster_url text,
  video_url text not null,
  category text not null default 'Geral',
  year int,
  duration_min int,
  views int not null default 0,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.movies to authenticated;
grant all on public.movies to service_role;
alter table public.movies enable row level security;
create policy "movies_select_auth" on public.movies for select to authenticated using (true);
create policy "movies_staff_insert" on public.movies for insert to authenticated with check (public.is_staff(auth.uid()) and created_by = auth.uid());
create policy "movies_staff_update" on public.movies for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "movies_staff_delete" on public.movies for delete to authenticated using (public.is_staff(auth.uid()));
create trigger movies_updated_at before update on public.movies for each row execute function public.update_updated_at_column();

create or replace function public.increment_movie_views(_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.movies set views = views + 1 where id = _id
$$;
revoke all on function public.increment_movie_views(uuid) from anon;
grant execute on function public.increment_movie_views(uuid) to authenticated;

-- =============== C. FIGURINHAS ===============
create table public.sticker_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users on delete cascade,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sticker_packs to authenticated;
grant all on public.sticker_packs to service_role;
alter table public.sticker_packs enable row level security;
create policy "packs_select" on public.sticker_packs for select to authenticated using (is_public or owner_id = auth.uid());
create policy "packs_insert" on public.sticker_packs for insert to authenticated with check (owner_id = auth.uid());
create policy "packs_update" on public.sticker_packs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "packs_delete" on public.sticker_packs for delete to authenticated using (owner_id = auth.uid());
create trigger packs_updated_at before update on public.sticker_packs for each row execute function public.update_updated_at_column();

create table public.stickers (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid references public.sticker_packs on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  image_url text not null,
  emoji text,
  is_public boolean not null default true,
  uses int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stickers to authenticated;
grant all on public.stickers to service_role;
alter table public.stickers enable row level security;
create policy "stickers_select" on public.stickers for select to authenticated using (is_public or owner_id = auth.uid());
create policy "stickers_insert" on public.stickers for insert to authenticated with check (owner_id = auth.uid());
create policy "stickers_update" on public.stickers for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "stickers_delete" on public.stickers for delete to authenticated using (owner_id = auth.uid());

create or replace function public.bump_sticker(_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.stickers set uses = uses + 1 where id = _id
$$;
revoke all on function public.bump_sticker(uuid) from anon;
grant execute on function public.bump_sticker(uuid) to authenticated;

-- =============== D. ANEXOS + CRIPTOGRAFIA ===============
alter table public.messages
  add column if not exists media_url text,
  add column if not exists media_name text,
  add column if not exists media_mime text,
  add column if not exists media_size bigint,
  add column if not exists cipher text,
  add column if not exists iv text,
  add column if not exists enc_v int not null default 0;

create table public.device_keys (
  user_id uuid primary key references auth.users on delete cascade,
  public_key text not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.device_keys to authenticated;
grant all on public.device_keys to service_role;
alter table public.device_keys enable row level security;
create policy "device_keys_select_auth" on public.device_keys for select to authenticated using (true);
create policy "device_keys_insert_own" on public.device_keys for insert to authenticated with check (user_id = auth.uid());
create policy "device_keys_update_own" on public.device_keys for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger device_keys_updated_at before update on public.device_keys for each row execute function public.update_updated_at_column();

create table public.conversation_keys (
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  wrapped_key text not null,
  wrap_iv text not null,
  sender_pub text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
grant select, insert, delete on public.conversation_keys to authenticated;
grant all on public.conversation_keys to service_role;
alter table public.conversation_keys enable row level security;
create policy "convkeys_select_own" on public.conversation_keys for select to authenticated using (user_id = auth.uid());
create policy "convkeys_insert_member" on public.conversation_keys for insert to authenticated
  with check (public.is_member(_conv => conversation_id, _user => auth.uid())
         and public.is_member(_conv => conversation_id, _user => user_id));
create policy "convkeys_delete_own" on public.conversation_keys for delete to authenticated using (user_id = auth.uid());

-- =============== E. SKINS ===============
create table public.skins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null default 'Minha skin',
  config jsonb not null default '{}'::jsonb,
  accessories jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.skins to authenticated;
grant all on public.skins to service_role;
alter table public.skins enable row level security;
create policy "skins_select_auth" on public.skins for select to authenticated using (true);
create policy "skins_insert_own" on public.skins for insert to authenticated with check (user_id = auth.uid());
create policy "skins_update_own" on public.skins for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "skins_delete_own" on public.skins for delete to authenticated using (user_id = auth.uid());
create trigger skins_updated_at before update on public.skins for each row execute function public.update_updated_at_column();

-- =============== F. IA PERSONAL / IDIOMAS ===============
create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  track text not null,
  xp int not null default 0,
  level int not null default 1,
  streak int not null default 0,
  last_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track)
);
grant select, insert, update, delete on public.learning_progress to authenticated;
grant all on public.learning_progress to service_role;
alter table public.learning_progress enable row level security;
create policy "lp_select_own" on public.learning_progress for select to authenticated using (user_id = auth.uid());
create policy "lp_insert_own" on public.learning_progress for insert to authenticated with check (user_id = auth.uid());
create policy "lp_update_own" on public.learning_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "lp_delete_own" on public.learning_progress for delete to authenticated using (user_id = auth.uid());
create trigger lp_updated_at before update on public.learning_progress for each row execute function public.update_updated_at_column();

create or replace function public.add_learning_xp(_track text, _xp int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _row public.learning_progress; _today date := (now() at time zone 'utc')::date;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  if _xp < 0 or _xp > 200 then return jsonb_build_object('ok', false, 'error', 'xp inválido'); end if;
  insert into public.learning_progress as lp (user_id, track, xp, streak, last_day)
  values (auth.uid(), _track, _xp, 1, _today)
  on conflict (user_id, track) do update
    set xp = lp.xp + _xp,
        streak = case
          when lp.last_day = _today then lp.streak
          when lp.last_day = _today - 1 then lp.streak + 1
          else 1 end,
        last_day = _today,
        level = greatest(1, ((lp.xp + _xp) / 100) + 1)
  returning * into _row;
  return jsonb_build_object('ok', true, 'xp', _row.xp, 'level', _row.level, 'streak', _row.streak);
end $$;
revoke all on function public.add_learning_xp(text, int) from anon;
grant execute on function public.add_learning_xp(text, int) to authenticated;

-- =============== G. MODS AI ===============
alter table public.mods
  add column if not exists ai_review text,
  add column if not exists quality int;

-- =============== H. BUSCA POR NÚMERO ===============
create or replace function public.find_by_app_phone(_phone text)
returns table(id uuid, username text, display_name text, avatar_url text, app_phone text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.app_phone
  from public.profiles p
  where auth.uid() is not null
    and p.app_phone is not null
    and regexp_replace(p.app_phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
  limit 1
$$;
revoke all on function public.find_by_app_phone(text) from anon;
grant execute on function public.find_by_app_phone(text) to authenticated;

-- =============== I. STORAGE POLICIES ===============
create policy "chat_media_own_read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chat_media_own_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chat_media_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "stickers_read_auth" on storage.objects for select to authenticated
  using (bucket_id = 'stickers');
create policy "stickers_own_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "stickers_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "stickers_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "movies_read_auth" on storage.objects for select to authenticated
  using (bucket_id = 'movies');
create policy "movies_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'movies' and public.is_staff(auth.uid()));
create policy "movies_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'movies' and public.is_staff(auth.uid()))
  with check (bucket_id = 'movies' and public.is_staff(auth.uid()));
create policy "movies_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'movies' and public.is_staff(auth.uid()));