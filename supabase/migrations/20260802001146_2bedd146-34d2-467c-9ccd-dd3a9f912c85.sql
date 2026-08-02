-- 1. Messages: reply, edit, delete-for-everyone
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

GRANT UPDATE ON public.messages TO authenticated;
DROP POLICY IF EXISTS "senders update own messages" ON public.messages;
CREATE POLICY "senders update own messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 2. Reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members read reactions" ON public.message_reactions;
CREATE POLICY "members read reactions" ON public.message_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND public.is_member(m.conversation_id, auth.uid())
    )
  );
DROP POLICY IF EXISTS "members add own reactions" ON public.message_reactions;
CREATE POLICY "members add own reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND public.is_member(m.conversation_id, auth.uid())
    )
  );
DROP POLICY IF EXISTS "users delete own reactions" ON public.message_reactions;
CREATE POLICY "users delete own reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3. Starred (favorite) messages
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
GRANT SELECT, INSERT, DELETE ON public.starred_messages TO authenticated;
GRANT ALL ON public.starred_messages TO service_role;
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own starred" ON public.starred_messages;
CREATE POLICY "own starred" ON public.starred_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Per-member chat preferences: pin / mute / archive
ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted_until timestamptz,
  ADD COLUMN IF NOT EXISTS nickname text;

GRANT UPDATE ON public.conversation_members TO authenticated;
DROP POLICY IF EXISTS "members update own row" ON public.conversation_members;
CREATE POLICY "members update own row" ON public.conversation_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Scheduled messages
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content text NOT NULL,
  send_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_messages TO authenticated;
GRANT ALL ON public.scheduled_messages TO service_role;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own scheduled" ON public.scheduled_messages;
CREATE POLICY "own scheduled" ON public.scheduled_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Call history
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'ringing',
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants read calls" ON public.call_logs;
CREATE POLICY "participants read calls" ON public.call_logs
  FOR SELECT TO authenticated USING (auth.uid() IN (caller_id, callee_id));
DROP POLICY IF EXISTS "caller creates call" ON public.call_logs;
CREATE POLICY "caller creates call" ON public.call_logs
  FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid());
DROP POLICY IF EXISTS "participants update call" ON public.call_logs;
CREATE POLICY "participants update call" ON public.call_logs
  FOR UPDATE TO authenticated USING (auth.uid() IN (caller_id, callee_id)) WITH CHECK (auth.uid() IN (caller_id, callee_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;