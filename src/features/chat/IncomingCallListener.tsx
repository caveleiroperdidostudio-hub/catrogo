import { useEffect, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CallScreen } from "./CallScreen";

type Invite = {
  sessionId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string | null;
  conversationId: string;
};

/**
 * Mounted once at the app shell. Listens for incoming call invites
 * addressed to the signed-in user and shows an Accept/Reject overlay.
 */
export function IncomingCallListener() {
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [active, setActive] = useState<Invite | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`inbox-${user.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "call-invite" }, (msg) => {
      const p = msg.payload as Invite;
      if (!active) setInvite(p);
    });
    ch.on("broadcast", { event: "call-cancel" }, (msg) => {
      const p = msg.payload as { sessionId: string };
      setInvite((cur) => (cur && cur.sessionId === p.sessionId ? null : cur));
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, active]);

  if (!user) return null;

  const accept = () => {
    if (!invite) return;
    setActive(invite);
    setInvite(null);
  };

  const reject = async () => {
    if (!invite) return;
    const ch = supabase.channel(`inbox-${invite.fromUserId}`);
    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.send({ type: "broadcast", event: "call-reject", payload: { sessionId: invite.sessionId } });
        supabase.removeChannel(ch);
      }
    });
    setInvite(null);
  };

  return (
    <>
      {invite && !active && (
        <div className="fixed inset-x-0 top-0 z-[120] mx-auto max-w-md p-3">
          <div className="rounded-2xl glass border border-[var(--cosmic)]/40 cosmic-glow p-4 flex items-center gap-3">
            <Avatar className="h-12 w-12 carlos-avatar">
              {invite.fromAvatar && <AvatarImage src={invite.fromAvatar} />}
              <AvatarFallback>{invite.fromName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{invite.fromName}</div>
              <div className="text-xs text-muted-foreground">Chamada de voz recebida…</div>
            </div>
            <Button size="icon" className="h-11 w-11 rounded-full bg-red-600 hover:bg-red-700" onClick={reject}>
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button size="icon" className="h-11 w-11 rounded-full bg-green-600 hover:bg-green-700" onClick={accept}>
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
      {active && (
        <CallScreen
          mode="voice"
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
}): Promise<string> {
  const sessionId = `${params.fromUserId}-${params.peerUserId}-${Date.now()}`;
  const ch = supabase.channel(`inbox-${params.peerUserId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); });
  });
  await ch.send({
    type: "broadcast",
    event: "call-invite",
    payload: {
      sessionId,
      fromUserId: params.fromUserId,
      fromName: params.fromName,
      fromAvatar: params.fromAvatar,
      conversationId: params.conversationId,
    },
  });
  supabase.removeChannel(ch);
  return sessionId;
}
