import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ONESIGNAL_APP_ID = "542ed395-1166-44c3-ad7d-fb3a4a2957c5";

export const notifyNewMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      conversationId: z.string().uuid(),
      preview: z.string().min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!apiKey) return { ok: false, reason: "missing_key" };

    // recipients = other members of the conversation
    const { data: members, error: mErr } = await supabaseAdmin
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", data.conversationId);
    if (mErr) return { ok: false, reason: mErr.message };

    const recipientIds = (members ?? [])
      .map((m: { user_id: string }) => m.user_id)
      .filter((id) => id !== userId);
    if (recipientIds.length === 0) return { ok: true, sent: 0 };

    // sender name + conversation name (best-effort)
    const [{ data: sender }, { data: conv }] = await Promise.all([
      supabaseAdmin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("conversations").select("name, is_group").eq("id", data.conversationId).maybeSingle(),
    ]);

    const senderName = (sender as { display_name?: string } | null)?.display_name ?? "Nova mensagem";
    const title = conv?.is_group && conv?.name ? `${senderName} em ${conv.name}` : senderName;

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: "push",
        include_aliases: { external_id: recipientIds },
        headings: { en: title, pt: title },
        contents: { en: data.preview, pt: data.preview },
        data: { conversationId: data.conversationId },
        url: `https://catrogo.lovable.app/?c=${data.conversationId}`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OneSignal error", res.status, text);
      return { ok: false, reason: text };
    }
    return { ok: true, sent: recipientIds.length };
  });
