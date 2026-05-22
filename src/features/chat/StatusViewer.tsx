import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type ViewerStatus = {
  id: string;
  user_id: string;
  content: string;
  background: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  profile?: { display_name: string };
};

const STATIC_DURATION = 5000; // 5s para foto/texto

export function StatusViewer({
  statuses, startIndex, onClose, onRemove, currentUserId,
}: {
  statuses: ViewerStatus[];
  startIndex: number;
  onClose: () => void;
  onRemove?: (id: string) => void;
  currentUserId?: string;
}) {
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedAt = useRef<number>(Date.now());
  const accumulated = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const current = statuses[index];
  const isVideo = current?.media_type === "video";

  // Reset por status
  useEffect(() => {
    setProgress(0);
    setPaused(false);
    accumulated.current = 0;
    startedAt.current = Date.now();
  }, [index]);

  // Progresso para foto/texto
  useEffect(() => {
    if (!current || isVideo) return;
    if (paused) { accumulated.current += Date.now() - startedAt.current; return; }
    startedAt.current = Date.now();
    const tick = () => {
      const elapsed = accumulated.current + (Date.now() - startedAt.current);
      const p = Math.min(1, elapsed / STATIC_DURATION);
      setProgress(p);
      if (p >= 1) { next(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, isVideo]);

  // Vídeo: pause/play + progresso via timeupdate
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (paused) v.pause(); else v.play().catch(() => {});
  }, [paused, muted, index]);

  const next = () => {
    if (index < statuses.length - 1) setIndex(index + 1);
    else onClose();
  };
  const prev = () => { if (index > 0) setIndex(index - 1); };

  const onVideoTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };
  const onVideoEnded = () => next();

  // Keyboard nav
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center select-none">
      {/* Tap zones */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={prev} />
      <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={next} />
      <div
        className="absolute inset-0 z-0"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      />

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 flex gap-1">
        {statuses.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-100 ease-linear"
              style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-6 left-0 right-0 z-30 px-4 pt-2 flex items-center gap-3 text-white">
        <Avatar className="h-9 w-9 ring-2 ring-white/40">
          <AvatarFallback className="bg-white/20 text-white text-sm">
            {current.profile?.display_name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{current.profile?.display_name ?? "Viajante"}</div>
          <div className="text-xs opacity-70">{new Date(current.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        {isVideo && (
          <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/15 rounded-full"
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        )}
        {current.user_id === currentUserId && onRemove && (
          <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-red-500/30 rounded-full"
            onClick={(e) => { e.stopPropagation(); onRemove(current.id); next(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/15 rounded-full"
          onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="relative z-[5] w-full h-full flex items-center justify-center" style={{ background: current.background ?? "oklch(0.12 0.04 280)" }}>
        {current.media_type === "image" && current.media_url && (
          <img src={current.media_url} alt="" className="max-h-full max-w-full object-contain" />
        )}
        {current.media_type === "video" && current.media_url && (
          <video
            ref={videoRef}
            src={current.media_url}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            onTimeUpdate={onVideoTime}
            onEnded={onVideoEnded}
          />
        )}
        {!current.media_url && (
          <div className="text-white text-2xl font-semibold px-8 text-center">{current.content}</div>
        )}
        {current.content && current.media_url && (
          <div className="absolute bottom-20 left-0 right-0 px-6 text-center text-white font-medium drop-shadow-lg">
            <span className="bg-black/40 px-3 py-1.5 rounded-md backdrop-blur-sm">{current.content}</span>
          </div>
        )}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">Pausado</div>
          </div>
        )}
      </div>
    </div>
  );
}
