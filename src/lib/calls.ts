import { supabase } from "@/integrations/supabase/client";

export type CallMode = "voice" | "video";
export type CallStatus = "ringing" | "answered" | "missed" | "rejected" | "canceled";

export async function logCallStart(params: {
  sessionId: string;
  conversationId: string | null;
  callerId: string;
  calleeId: string;
  mode: CallMode;
}): Promise<void> {
  await supabase.from("call_logs").insert({
    session_id: params.sessionId,
    conversation_id: params.conversationId,
    caller_id: params.callerId,
    callee_id: params.calleeId,
    mode: params.mode,
    status: "ringing",
  });
}

export async function logCallUpdate(sessionId: string, patch: { status?: CallStatus; duration_seconds?: number }) {
  await supabase.from("call_logs").update(patch).eq("session_id", sessionId);
}
