import { useEffect, useRef, useState } from "react";
import { Phone, Video, VideoOff, Mic, MicOff, PhoneOff, Volume2, VolumeX, MonitorUp, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playRingback } from "@/lib/ringtone";
import { logCallUpdate } from "@/lib/calls";

export type CallMode = "voice" | "video";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const RING_TIMEOUT_MS = 45000;

type Props = {
  mode: CallMode;
  /** Channel both peers join for signaling. */
  sessionId: string;
  /** True for the side that initiated the call. */
  isCaller: boolean;
  myUserId: string;
  peerUserId: string;
  name: string;
  avatarUrl?: string | null;
  onEnd: () => void;
};

export function CallScreen({
  mode, sessionId, isCaller, myUserId, peerUserId, name, avatarUrl, onEnd,
}: Props) {
  const [status, setStatus] = useState<"conectando" | "tocando" | "conectada" | "encerrada">(isCaller ? "tocando" : "conectando");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const isVideo = mode === "video";

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const remoteDescSetRef = useRef(false);
  const answeredRef = useRef(false);
  const endedRef = useRef(false);
  const secondsRef = useRef(0);
  const ringbackRef = useRef<{ stop: () => void } | null>(null);
  const endRef = useRef<(reason?: "rejected" | "missed" | "normal") => void>(() => {});

  // Timer
  useEffect(() => {
    if (status !== "conectada") return;
    const id = setInterval(() => setSeconds((s) => { secondsRef.current = s + 1; return s + 1; }), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Ringback while the caller waits
  useEffect(() => {
    if (!isCaller || status !== "tocando") return;
    ringbackRef.current = playRingback();
    return () => { ringbackRef.current?.stop(); ringbackRef.current = null; };
  }, [isCaller, status]);

  // Main WebRTC setup
  useEffect(() => {
    let cleaned = false;
    let offerRetry: ReturnType<typeof setInterval> | null = null;
    let ringTimeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (reason: "rejected" | "missed" | "normal" = "normal") => {
      if (endedRef.current) return;
      endedRef.current = true;
      const answered = answeredRef.current;
      logCallUpdate(sessionId, {
        status: answered ? "answered" : reason === "rejected" ? "rejected" : reason === "missed" ? "missed" : isCaller ? "canceled" : "missed",
        duration_seconds: secondsRef.current,
      }).catch(() => {});
      setStatus("encerrada");
      onEnd();
    };
    endRef.current = finish;

    const sendSignal = async (payload: Record<string, unknown>) => {
      await channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { from: myUserId, ...payload },
      });
    };

    const handleOffer = async (pc: RTCPeerConnection, sdp: RTCSessionDescriptionInit) => {
      if (pc.signalingState !== "stable" && pc.remoteDescription) return;
      await pc.setRemoteDescription(sdp);
      remoteDescSetRef.current = true;
      for (const c of pendingIceRef.current) {
        try { await pc.addIceCandidate(c); } catch { /* */ }
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal({ kind: "answer", sdp: answer });
    };

    const setupPeer = async () => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          isVideo ? { audio: true, video: { facingMode: "user" } } : { audio: true },
        );
        if (cleaned) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        camTrackRef.current = stream.getVideoTracks()[0] ?? null;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        if (isVideo && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch {
        toast.error(isVideo ? "Permissão de câmera/microfone negada" : "Permissão de microfone negada");
        finish();
        return;
      }

      pc.ontrack = (e) => {
        const [remote] = e.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remote;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (isVideo && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal({ kind: "ice", candidate: e.candidate.toJSON() });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          answeredRef.current = true;
          ringbackRef.current?.stop();
          setStatus("conectada");
          logCallUpdate(sessionId, { status: "answered" }).catch(() => {});
          if (offerRetry) { clearInterval(offerRetry); offerRetry = null; }
          if (ringTimeout) { clearTimeout(ringTimeout); ringTimeout = null; }
        }
        if (pc.connectionState === "failed") {
          toast.error("Conexão perdida");
          finish();
        }
      };

      if (isCaller) {
        const makeOffer = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal({ kind: "offer", sdp: offer });
        };
        await makeOffer();
        // Reenvia a oferta até o outro lado responder (evita perder o sinal
        // quando o destinatário ainda está pedindo permissão de mídia).
        offerRetry = setInterval(() => {
          if (remoteDescSetRef.current) { if (offerRetry) clearInterval(offerRetry); return; }
          sendSignal({ kind: "offer", sdp: pc.localDescription?.toJSON() as RTCSessionDescriptionInit });
        }, 2500);
        ringTimeout = setTimeout(() => {
          if (!answeredRef.current) {
            toast.info("Sem resposta");
            finish("missed");
          }
        }, RING_TIMEOUT_MS);
      } else if (pendingOfferRef.current) {
        const queued = pendingOfferRef.current;
        pendingOfferRef.current = null;
        await handleOffer(pc, queued);
      }
    };

    const channel = supabase.channel(`webrtc-${sessionId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "signal" }, async (msg) => {
      const data = msg.payload as { from: string; kind: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
      if (data.from === myUserId) return;
      const pc = pcRef.current;

      if (data.kind === "offer" && data.sdp) {
        if (!pc) { pendingOfferRef.current = data.sdp; return; }
        if (remoteDescSetRef.current) return; // já negociado
        await handleOffer(pc, data.sdp);
      } else if (data.kind === "answer" && data.sdp) {
        if (!pc || pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription(data.sdp);
        remoteDescSetRef.current = true;
        for (const c of pendingIceRef.current) {
          try { await pc.addIceCandidate(c); } catch { /* */ }
        }
        pendingIceRef.current = [];
      } else if (data.kind === "ice" && data.candidate) {
        if (pc && remoteDescSetRef.current) {
          try { await pc.addIceCandidate(data.candidate); } catch { /* */ }
        } else {
          pendingIceRef.current.push(data.candidate);
        }
      } else if (data.kind === "reject") {
        toast.info("Chamada recusada");
        finish("rejected");
      } else if (data.kind === "bye") {
        toast.info("Chamada encerrada pelo outro lado");
        finish();
      }
    });

    channel.subscribe((s) => {
      if (s === "SUBSCRIBED") setupPeer();
    });

    return () => {
      cleaned = true;
      if (offerRetry) clearInterval(offerRetry);
      if (ringTimeout) clearTimeout(ringTimeout);
      try { channel.send({ type: "broadcast", event: "signal", payload: { from: myUserId, kind: "bye" } }); } catch { /* */ }
      supabase.removeChannel(channel);
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      ringbackRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isCaller, myUserId]);

  const endCall = () => endRef.current("normal");

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    if (remoteAudioRef.current) remoteAudioRef.current.volume = next ? 1 : 0.25;
    setSpeakerOn(next);
  };

  const toggleShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) { toast.info("Compartilhar tela só em chamadas de vídeo"); return; }
    if (sharing) {
      if (camTrackRef.current) await sender.replaceTrack(camTrackRef.current);
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      await sender.replaceTrack(track);
      track.onended = () => {
        if (camTrackRef.current) sender.replaceTrack(camTrackRef.current).catch(() => {});
        setSharing(false);
      };
      setSharing(true);
    } catch {
      toast.error("Não foi possível compartilhar a tela");
    }
  };

  const retryIce = async () => {
    const pc = pcRef.current;
    if (!pc || !isCaller) return;
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await channelRef.current?.send({ type: "broadcast", event: "signal", payload: { from: myUserId, kind: "offer", sdp: offer } });
      toast.info("Reconectando…");
    } catch { /* */ }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  void peerUserId;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden text-white">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, oklch(0.4 0.2 295 / 0.5), transparent 55%), radial-gradient(circle at 70% 80%, oklch(0.4 0.2 230 / 0.5), transparent 55%), oklch(0.08 0.04 280)",
        }}
      />
      <div className="absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:30px_30px] animate-[pulse_4s_ease-in-out_infinite]" />

      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 -z-[5] h-full w-full object-cover ${status === "conectada" ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {isVideo && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 right-4 z-20 h-40 w-28 rounded-2xl object-cover border border-white/20 shadow-xl bg-black/50"
        />
      )}

      <div className="pt-12 pb-4 px-6 w-full text-center z-10">
        {!(isVideo && status === "conectada") && (
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-3xl bg-[var(--cosmic)]/40 ${status === "conectada" ? "animate-pulse" : ""}`} />
              <Avatar className="h-40 w-40 ring-4 ring-white/20 relative carlos-avatar">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="bg-white/10 text-white text-5xl backdrop-blur-md">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        )}
        <h2 className="text-3xl font-semibold drop-shadow">{name}</h2>
        <p className="text-sm opacity-80 mt-1 flex items-center justify-center gap-1.5">
          {status === "conectada" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              {isVideo ? "Chamada de vídeo" : "Em chamada"} · {fmt(seconds)}
              {sharing && " · compartilhando tela"}
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nebula)] animate-ping" />
              {isCaller ? "Chamando…" : "Conectando…"}
            </>
          )}
        </p>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="pb-10 px-6 w-full flex items-center justify-center gap-3 z-10 flex-wrap">
        <Button
          size="icon"
          variant="ghost"
          className={`h-14 w-14 rounded-full backdrop-blur-md ${muted ? "bg-white/30" : "bg-white/10"} hover:bg-white/20`}
          onClick={toggleMute}
          title={muted ? "Ativar microfone" : "Silenciar microfone"}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md"
          onClick={toggleSpeaker}
          title="Volume"
        >
          {speakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </Button>

        {isVideo && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className={`h-14 w-14 rounded-full backdrop-blur-md ${camOff ? "bg-white/30" : "bg-white/10"} hover:bg-white/20`}
              onClick={toggleCam}
              title={camOff ? "Ligar câmera" : "Desligar câmera"}
            >
              {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`h-14 w-14 rounded-full backdrop-blur-md ${sharing ? "bg-white/30" : "bg-white/10"} hover:bg-white/20`}
              onClick={toggleShare}
              title="Compartilhar tela"
            >
              <MonitorUp className="h-6 w-6" />
            </Button>
          </>
        )}

        {isCaller && status !== "conectada" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md"
            onClick={retryIce}
            title="Tentar reconectar"
          >
            <RefreshCw className="h-6 w-6" />
          </Button>
        )}

        <Button size="icon" className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl" onClick={endCall} title="Encerrar">
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

export { Phone, Video };
