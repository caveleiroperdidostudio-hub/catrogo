import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VoiceRecorder({
  onCancel, onSend,
}: {
  onCancel: () => void;
  onSend: (durationSeconds: number) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
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
    </div>
  );
}

export function VoiceRecorderActions({
  onCancel, onSend, recording, onStart,
}: {
  recording: boolean;
  onCancel: () => void;
  onSend: () => void;
  onStart: () => void;
}) {
  if (!recording) {
    return (
      <Button size="icon" variant="ghost" onClick={onStart} title="Gravar áudio" className="rounded-full">
        <Mic className="h-4 w-4 text-[var(--nebula)]" />
      </Button>
    );
  }
  return (
    <Button size="icon" onClick={onSend} className="rounded-full cosmic-glow" title="Enviar áudio">
      <Send className="h-4 w-4" />
    </Button>
  );
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

export function AudioBubble({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    startRef.current = Date.now() - progress * duration * 1000;
    const tick = () => {
      const elapsed = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(1, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const shown = playing || progress > 0 ? duration * progress : duration;

  return (
    <div className="flex items-center gap-2 min-w-[180px] py-1">
      <button
        onClick={() => setPlaying((p) => !p)}
        className="h-9 w-9 rounded-full bg-[var(--cosmic)]/30 hover:bg-[var(--cosmic)]/50 flex items-center justify-center border border-[var(--cosmic)]/40 transition-colors"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
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
