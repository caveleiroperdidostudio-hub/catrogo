import { useEffect, useRef, useState } from "react";
import { Phone, Video, Mic, MicOff, PhoneOff, VideoOff, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type CallMode = "voice" | "video";

export function CallScreen({
  mode, name, avatarUrl, onEnd,
}: {
  mode: CallMode;
  name: string;
  avatarUrl?: string | null;
  onEnd: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [status, setStatus] = useState<"chamando" | "conectada">("chamando");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setStatus("conectada"), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== "conectada") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Tenta acessar câmera real para videochamada — fallback é animação
  useEffect(() => {
    if (mode !== "video" || camOff) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = s;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
          localVideoRef.current.play().catch(() => {});
        }
      } catch { /* sem permissão — usamos fallback animado */ }
    })();
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [mode, camOff]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden text-white">
      {/* Fundo "feed remoto" */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, oklch(0.4 0.2 295 / 0.5), transparent 55%), radial-gradient(circle at 70% 80%, oklch(0.4 0.2 230 / 0.5), transparent 55%), oklch(0.08 0.04 280)",
        }}
      />
      {/* Estrelas em movimento */}
      <div className="absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:30px_30px] animate-[pulse_4s_ease-in-out_infinite]" />

      {mode === "video" && (
        <>
          {/* "Câmera do contato" — simulação com gradiente animado e blur */}
          <div className="absolute inset-0 -z-[5] backdrop-blur-2xl">
            <div className="absolute inset-0 opacity-70 bg-gradient-to-br from-[var(--cosmic)]/30 via-[var(--nebula)]/20 to-transparent animate-pulse" />
          </div>
          {/* Avatar grande como "video" do contato */}
          <div className="absolute inset-0 flex items-center justify-center -z-[3]">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-3xl bg-[var(--cosmic)]/40 animate-pulse" />
              <Avatar className="h-48 w-48 ring-4 ring-white/20 relative">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="bg-white/10 text-white text-6xl backdrop-blur-md">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </>
      )}

      {/* Top: nome + status */}
      <div className="pt-12 pb-4 px-6 w-full text-center z-10">
        {mode === "voice" && (
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-3xl bg-[var(--cosmic)]/40 animate-pulse" />
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
          {status === "chamando" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nebula)] animate-ping" />
              Chamando…
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              {mode === "video" ? "Videochamada" : "Em chamada"} · {fmt(seconds)}
            </>
          )}
        </p>
      </div>

      {/* Miniatura câmera local (videochamada) */}
      {mode === "video" && (
        <div className="absolute bottom-32 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
          {!camOff ? (
            <video ref={localVideoRef} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[var(--cosmic)]/40 to-[var(--nebula)]/30">
              <VideoOff className="h-8 w-8 opacity-80" />
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="pb-10 px-6 w-full flex items-center justify-center gap-4 z-10">
        <Button
          size="icon"
          variant="ghost"
          className={`h-14 w-14 rounded-full backdrop-blur-md ${muted ? "bg-white/30" : "bg-white/10"} hover:bg-white/20`}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {mode === "video" && (
          <Button
            size="icon" variant="ghost"
            className={`h-14 w-14 rounded-full backdrop-blur-md ${camOff ? "bg-white/30" : "bg-white/10"} hover:bg-white/20`}
            onClick={() => setCamOff((c) => !c)}
          >
            {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}

        <Button size="icon" variant="ghost" className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md">
          <Volume2 className="h-6 w-6" />
        </Button>

        <Button size="icon" className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl" onClick={onEnd}>
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

// Re-export icons usados externamente sem precisar reimportar
export { Phone, Video };
