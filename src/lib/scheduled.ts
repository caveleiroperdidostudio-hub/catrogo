import { supabase } from "@/integrations/supabase/client";

/**
 * Envia as mensagens agendadas do usuário que já venceram.
 * Roda no cliente enquanto o app está aberto (sem worker externo).
 */
export async function flushScheduledMessages(userId: string): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("scheduled_messages")
    .select("id, conversation_id, content")
    .eq("user_id", userId)
    .eq("sent", false)
    .lte("send_at", nowIso)
    .limit(20);

  const due = data ?? [];
  let sent = 0;
  for (const s of due) {
    const { error } = await supabase.from("messages").insert({
      conversation_id: s.conversation_id,
      sender_id: userId,
      content: s.content,
    });
    if (error) continue;
    await supabase.from("scheduled_messages").update({ sent: true }).eq("id", s.id);
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", s.conversation_id);
    sent += 1;
  }
  return sent;
}
