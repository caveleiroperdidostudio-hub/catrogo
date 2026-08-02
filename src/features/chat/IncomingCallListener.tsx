import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CallScreen } from "./CallScreen";
import { playIncomingRing } from "@/lib/ringtone";
import { logCallStart, logCallUpdate, type CallMode } from "@/lib/calls";

type Invite = {
  sessionId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string | null;
  conversationId: string;
  mode: CallMode;
};

/**
 * Mounted once at the app shell. Listens for incoming call invites
 * addressed to the signed-in user and shows an Accept/Reject overlay.
 */
export function IncomingCallListener() {
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [active, setActive] = useState<Invite | null>(null);
  const ringRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`inbox-${user.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "call-invite" }, (msg) => {
      const p = msg.payload as Invite;
      setActive((cur) => {
        if (!cur) setInvite(p);
        return cur;
      });
    });
    ch.on("broadcast", { event: "call-cancel" }, (msg) => {
      const p = msg.payload as { sessionId: string };
      setInvite((cur) => (cur && cur.sessionId === p.sessionId ? null : cur));
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Ringtone while an invite is pending
  useEffect(() => {
    if (invite && !active) {
      ringRef.current = playIncomingRing();
      const auto = setTimeout(() => setInvite(null), 45000);
      return () => { ringRef.current?.stop(); ringRef.current = null; clearTimeout(auto); };
    }
    ringRef.current?.stop();
    ringRef.current = null;
    return;
  }, [invite, active]);

  if (!user) return null;

  const accept = () => {
    if (!invite) return;
    ringRef.current?.stop();
    setActive(invite);
    setInvite(null);
  };

  const reject = async () => {
    if (!invite) return;
    ringRef.current?.stop();
    const target = invite;
    setInvite(null);
    // Avisa o chamador no canal da sessão (ele já está inscrito lá)
    const ch = supabase.channel(`webrtc-${target.sessionId}`);
    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.send({ type: "broadcast", event: "signal", payload: { from: user.id, kind: "reject" } });
        setTimeout(() => supabase.removeChannel(ch), 500);
      }
    });
    logCallUpdate(target.sessionId, { status: "rejected" }).catch(() => {});
  };

  return (
    <>
      {invite && !active && (
        <div className="fixed inset-x-0 top-0 z-[120] mx-auto max-w-md p-3">
          <div className="rounded-2xl glass border border-[var(--cosmic)]/40 cosmic-glow p-4 flex items-center gap-3 animate-in slide-in-from-top-4">
            <Avatar className="h-12 w-12 carlos-avatar">
              {invite.fromAvatar && <AvatarImage src={invite.fromAvatar} />}
              <AvatarFallback>{invite.fromName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{invite.fromName}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                {invite.mode === "video" ? <><Video className="h-3 w-3" /> Chamada de vídeo recebida…</> : <><Phone className="h-3 w-3" /> Chamada de voz recebida…</>}
              </div>
            </div>
            <Button size="icon" className="h-11 w-11 rounded-full bg-red-600 hover:bg-red-700" onClick={reject} title="Recusar">
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button size="icon" className="h-11 w-11 rounded-full bg-green-600 hover:bg-green-700" onClick={accept} title="Atender">
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
      {active && (
        <CallScreen
          mode={active.mode}
          sessionId={active.sessionId}
          isCaller={false}
          myUserId={user.id}
          peerUserId={active.fromUserId}
          name={active.fromName}
          avatarUrl={active.fromAvatar}
          onEnd={() => setActive(null)}
        />
      )}
    </>
  );
}

/** Helper: send a call invite to a peer, returning the sessionId to join. */
export async function sendCallInvite(params: {
  peerUserId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string | null;
  conversationId: string;
  mode: CallMode;
}): Promise<string> {
  const sessionId = `${params.fromUserId}-${params.peerUserId}-${Date.now()}`;
  await logCallStart({
    sessionId,
    conversationId: params.conversationId,
    callerId: params.fromUserId,
    calleeId: params.peerUserId,
    mode: params.mode,
  }).catch(() => {});

  const ch = supabase.channel(`inbox-${params.peerUserId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); });
  });
  // Reenvia o convite algumas vezes: garante entrega mesmo se o outro app
  // acabou de abrir/reconectar o canal.
  const payload = {
    sessionId,
    fromUserId: params.fromUserId,
    fromName: params.fromName,
    fromAvatar: params.fromAvatar,
    conversationId: params.conversationId,
    mode: params.mode,
  };
  await ch.send({ type: "broadcast", event: "call-invite", payload });
  let tries = 0;
  const retry = setInterval(async () => {
    tries += 1;
    await ch.send({ type: "broadcast", event: "call-invite", payload }).catch(() => {});
    if (tries >= 4) { clearInterval(retry); supabase.removeChannel(ch); }
  }, 2500);
  return sessionId;
}
