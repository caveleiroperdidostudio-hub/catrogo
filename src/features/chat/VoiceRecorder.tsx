import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Pause, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type RecordingHandle = {
  stop: () => Promise<{ blob: Blob; seconds: number } | null>;
  cancel: () => void;
};

export function VoiceRecorder({
  onCancel, onReady,
}: {
  onCancel: () => void;
  /** Called once the MediaRecorder is live, passing a handle the parent uses to stop+upload. */
  onReady: (h: RecordingHandle) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const mime = pickMime();
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.start(250);
        startedAtRef.current = Date.now();

        onReady({
          stop: () =>
            new Promise((resolve) => {
              if (rec.state === "inactive") return resolve(null);
              rec.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
                const s = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
                stream.getTracks().forEach((t) => t.stop());
                resolve({ blob, seconds: s });
              };
              rec.stop();
            }),
          cancel: () => {
            try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ }
            stream.getTracks().forEach((t) => t.stop());
            chunksRef.current = [];
          },
        });
      } catch (e) {
        setError("Permissão de microfone negada");
        toast.error("Não consegui acessar o microfone");
        setTimeout(onCancel, 600);
      }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      try { recorderRef.current?.state === "recording" && recorderRef.current.pause(); } catch { /* */ }
      return;
    }
    try { recorderRef.current?.state === "paused" && recorderRef.current.resume(); } catch { /* */ }
    tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [paused]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex-1 flex items-center gap-3 px-4 h-10 rounded-full bg-gradient-to-r from-red-500/15 via-[var(--cosmic)]/20 to-[var(--nebula)]/15 border border-[var(--cosmic)]/30">
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      <span className="font-mono text-sm tabular-nums text-[var(--nebula)]">{fmt(seconds)}</span>
      <Waveform paused={paused} />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPaused((p) => !p)} title={paused ? "Retomar" : "Pausar"}>
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onCancel} title="Cancelar">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {error && <span className="text-[10px] text-destructive ml-1">{error}</span>}
    </div>
  );
}

function pickMime(): string | null {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  const MR = (typeof MediaRecorder !== "undefined" ? MediaRecorder : null) as (typeof MediaRecorder & { isTypeSupported?: (t: string) => boolean }) | null;
  for (const m of candidates) {
    if (MR?.isTypeSupported?.(m)) return m;
  }
  return null;
}

function Waveform({ paused }: { paused: boolean }) {
  const bars = 18;
  return (
    <div className="flex-1 flex items-center justify-start gap-[3px] h-6 overflow-hidden">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[var(--nebula)]"
          style={{
            height: `${20 + ((i * 37) % 80)}%`,
            animation: paused ? "none" : `wave 0.9s ease-in-out ${i * 60}ms infinite`,
            opacity: paused ? 0.4 : 1,
          }}
        />
      ))}
      <style>{`@keyframes wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1.4); } }`}</style>
    </div>
  );
}

/** Uploads an audio blob to status-media bucket and returns its public URL. */
export async function uploadAudio(userId: string, blob: Blob): Promise<string> {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const path = `${userId}/audio-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("status-media").upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("status-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Audio bubble that plays a real URL (or shows duration only if no URL). */
export function AudioBubble({ duration, url }: { duration: number; url?: string }) {
  const { user } = useAuth();
  void user;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    if (!url) {
      toast.info("Áudio antigo sem arquivo — só duração disponível.");
      return;
    }
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!audioRef.current) {
      setLoading(true);
      const a = new Audio(url);
      a.preload = "metadata";
      a.onloadedmetadata = () => {
        if (Number.isFinite(a.duration)) setTotal(a.duration);
      };
      a.oncanplay = () => setLoading(false);
      a.ontimeupdate = () => {
        setCurrent(a.currentTime);
        const dur = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration;
        setProgress(Math.min(1, a.currentTime / dur));
      };
      a.onended = () => { setPlaying(false); setProgress(0); setCurrent(0); a.currentTime = 0; };
      a.onerror = () => { setLoading(false); setPlaying(false); toast.error("Falha ao tocar áudio"); };
      audioRef.current = a;
    }
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {
      setLoading(false);
      toast.error("Não consegui reproduzir (toque na tela primeiro)");
    });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const shown = playing || progress > 0 ? current : total;

  return (
    <div className="flex items-center gap-2 min-w-[200px] py-1">
      <button
        onClick={toggle}
        className="h-9 w-9 rounded-full bg-[var(--cosmic)]/30 hover:bg-[var(--cosmic)]/50 flex items-center justify-center border border-[var(--cosmic)]/40 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-6">
        {Array.from({ length: 22 }).map((_, i) => {
          const active = i / 22 < progress;
          return (
            <span
              key={i}
              className={`flex-1 rounded-full ${active ? "bg-[var(--nebula)]" : "bg-foreground/25"}`}
              style={{ height: `${30 + ((i * 53) % 70)}%` }}
            />
          );
        })}
      </div>
      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{fmt(shown)}</span>
    </div>
  );
}

export type { RecordingHandle };
