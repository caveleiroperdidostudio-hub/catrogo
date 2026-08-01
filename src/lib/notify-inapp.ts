import { supabase } from "@/integrations/supabase/client";

/** Notificações in-app (tabela notifications) disparadas por ações do usuário. */

export async function notifyFollow(targetUserId: string) {
  await supabase.rpc("notify_follow", { _target: targetUserId });
}

export async function notifyHype(targetUserId: string, amount: number) {
  await supabase.rpc("notify_hype", { _target: targetUserId, _amount: amount });
}

export async function notifyConversation(conversationId: string, preview: string) {
  await supabase.rpc("notify_message", { _conversation_id: conversationId, _preview: preview });
}

/** Notificação para o próprio usuário (RLS permite inserir só para si). */
export async function notifySelf(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  icon?: string;
  link?: string;
}) {
  await supabase.from("notifications").insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    icon: opts.icon ?? null,
    link: opts.link ?? null,
  });
}
