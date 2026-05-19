
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  about text default 'Disponível',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users" on public.profiles
  for select to authenticated using (true);
create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;

-- Security definer helper to avoid recursive RLS
create or replace function public.is_member(_conv uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_members where conversation_id = _conv and user_id = _user)
$$;

create policy "Members can view their conversations" on public.conversations
  for select to authenticated using (public.is_member(id, auth.uid()));
create policy "Authenticated can create conversations" on public.conversations
  for insert to authenticated with check (auth.uid() = created_by);
create policy "Members can update their conversations" on public.conversations
  for update to authenticated using (public.is_member(id, auth.uid()));

create policy "Members see member rows of their conversations" on public.conversation_members
  for select to authenticated using (public.is_member(conversation_id, auth.uid()) or user_id = auth.uid());
create policy "Users can join conversations" on public.conversation_members
  for insert to authenticated with check (true);
create policy "Users can leave conversations" on public.conversation_members
  for delete to authenticated using (user_id = auth.uid() or public.is_member(conversation_id, auth.uid()));

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text not null,
  message_type text not null default 'text',
  is_ai boolean not null default false,
  to_ai boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index on public.messages (conversation_id, created_at);

create policy "Members can read messages" on public.messages
  for select to authenticated using (public.is_member(conversation_id, auth.uid()));
create policy "Members can send messages" on public.messages
  for insert to authenticated with check (public.is_member(conversation_id, auth.uid()) and (sender_id = auth.uid() or sender_id is null));

-- bump last_message_at
create or replace function public.bump_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
create trigger trg_bump_conv_last_message after insert on public.messages
for each row execute function public.bump_conversation_last_message();

-- Statuses (stories)
create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  media_url text,
  background text default '#075E54',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);
alter table public.statuses enable row level security;
create policy "Authenticated can read fresh statuses" on public.statuses
  for select to authenticated using (expires_at > now());
create policy "Users insert own status" on public.statuses
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users delete own status" on public.statuses
  for delete to authenticated using (user_id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  if v_username = '' or v_username is null then v_username := 'user_' || substr(new.id::text, 1, 8); end if;
  -- ensure unique
  while exists(select 1 from public.profiles where username = v_username) loop
    v_username := v_username || substr(md5(random()::text),1,3);
  end loop;
  insert into public.profiles (id, username, display_name) values (new.id, v_username, v_name);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Realtime
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.statuses;
