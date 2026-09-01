import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize,
  PictureInPicture2, Settings2, X, Loader2, AlertTriangle, Subtitles, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useViewport } from "@/lib/viewport";

export type PlayerTrack = { label: string; src: string };
export type PlayerSubtitle = { label: string; srclang: string; src: string };

export type CatroPlayerProps = {
  title: string;
  subtitle?: string;
  /** Fonte única ou lista de qualidades. */
  sources: PlayerTrack[];
  subtitles?: PlayerSubtitle[];
  poster?: string | null;
  /** Segundo inicial (continuar de onde parou). */
  startAt?: number;
  /** Salva o progresso periodicamente. */
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  onNext?: () => void;
  onClose: () => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Reprodutor oficial do CatroGo: responsivo, com PiP, qualidades, legendas e modo cinema. */
export function CatroPlayer({
  title, subtitle, sources, subtitles = [], poster, startAt = 0,
  onProgress, onEnded, onNext, onClose,
}: CatroPlayerProps) {
  const { isMobile } = useViewport();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [qualityIdx, setQualityIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [cinema, setCinema] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [subIdx, setSubIdx] = useState(-1);

  useWakeLock(playing);

  const src = sources[qualityIdx]?.src ?? sources[0]?.src ?? "";

  const poke = useCallback(() => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), 3200);
  }, []);

  useEffect(() => {
    poke();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [poke]);

  // troca de qualidade preservando o tempo
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const wasPlaying = !v.paused;
    v.load();
    const onLoaded = () => {
      v.currentTime = t || startAt;
      if (wasPlaying) v.play().catch(() => {});
      v.removeEventListener("loadedmetadata", onLoaded);
    };
    v.addEventListener("loadedmetadata", onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityIdx]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // legendas
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    Array.from(v.textTracks).forEach((tr, i) => {
      tr.mode = i === subIdx ? "showing" : "disabled";
    });
  }, [subIdx, subtitles.length]);

  // atalhos de teclado (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); v.paused ? v.play() : v.pause(); }
      else if (e.key === "ArrowRight") v.currentTime += 10;
      else if (e.key === "ArrowLeft") v.currentTime -= 10;
      else if (e.key === "m") setMuted((m) => !m);
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "Escape" && !document.fullscreenElement) onClose();
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, poke]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapRef.current?.requestFullscreen();
    } catch {
      setCinema((c) => !c);
    }
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v || !("requestPictureInPicture" in v)) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* ignora */
    }
  };

  const seekTo = (pct: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = Math.min(duration, Math.max(0, pct * duration));
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, v.currentTime + delta);
    poke();
  };

  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const tapSize = isMobile ? "h-12 w-12" : "h-10 w-10";

  return (
    <div
      ref={wrapRef}
      className={`fixed inset-0 z-[60] flex flex-col bg-black ${cinema ? "" : ""}`}
      style={{ height: "var(--app-vh, 100dvh)", width: "var(--app-vw, 100vw)" }}
      onMouseMove={poke}
      onTouchStart={poke}
    >
      {/* topo */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-6 transition-opacity duration-300 ${
          showUi ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Voltar" className={tapSize}>
          <X className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-semibold text-white sm:text-base">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-white/60">{subtitle}</div>}
        </div>
        {"requestPictureInPicture" in HTMLVideoElement.prototype && (
          <Button size="icon" variant="ghost" onClick={togglePip} aria-label="Picture-in-picture" className={tapSize}>
            <PictureInPicture2 className="h-5 w-5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Opções de reprodução" className={tapSize}>
              <Settings2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {sources.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs">Qualidade</DropdownMenuLabel>
                {sources.map((s, i) => (
                  <DropdownMenuItem key={s.label + i} onClick={() => setQualityIdx(i)}>
                    {i === qualityIdx ? "• " : ""}
                    {s.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="flex items-center gap-1 text-xs">
              <Gauge className="h-3 w-3" /> Velocidade
            </DropdownMenuLabel>
            {SPEEDS.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => {
                  setSpeed(s);
                  if (videoRef.current) videoRef.current.playbackRate = s;
                }}
              >
                {s === speed ? "• " : ""}
                {s}x
              </DropdownMenuItem>
            ))}
            {subtitles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-1 text-xs">
                  <Subtitles className="h-3 w-3" /> Legendas
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSubIdx(-1)}>{subIdx === -1 ? "• " : ""}Desligadas</DropdownMenuItem>
                {subtitles.map((t, i) => (
                  <DropdownMenuItem key={t.srclang + i} onClick={() => setSubIdx(i)}>
                    {subIdx === i ? "• " : ""}
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCinema((c) => !c)}>
              {cinema ? "Sair do modo cinema" : "Modo cinema"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* vídeo */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <video
          ref={videoRef}
          key={src}
          src={src}
          poster={poster ?? undefined}
          autoPlay
          playsInline
          preload="metadata"
          className="max-h-full max-w-full"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.paused ? v.play() : v.pause();
            poke();
          }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration || 0);
            if (startAt > 0 && startAt < (v.duration || Infinity) - 5) v.currentTime = startAt;
            v.playbackRate = speed;
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => { setWaiting(false); setError(null); }}
          onCanPlay={() => setWaiting(false)}
          onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setCurrent(v.currentTime);
            if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
            if (Math.floor(v.currentTime) % 5 === 0) onProgress?.(v.currentTime, v.duration || 0);
          }}
          onEnded={() => { setPlaying(false); onProgress?.(0, duration); onEnded?.(); }}
          onError={() => { setWaiting(false); setError("Não foi possível carregar este vídeo. Verifique sua conexão e tente novamente."); }}
        >
          {subtitles.map((t) => (
            <track key={t.srclang} kind="subtitles" label={t.label} srcLang={t.srclang} src={t.src} />
          ))}
        </video>

        {waiting && !error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-3 text-sm text-white/80">{error}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setError(null);
                  setWaiting(true);
                  videoRef.current?.load();
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* controles */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-10 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ${
          showUi ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* barra de progresso */}
        <div
          role="slider"
          aria-label="Progresso do filme"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          className="group relative mb-2 cursor-pointer py-3"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const move = (ev: PointerEvent) => seekTo((ev.clientX - rect.left) / rect.width);
            seekTo((e.clientX - rect.left) / rect.width);
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="absolute h-1.5 rounded-full bg-white/25" style={{ width: `${bufferedPct}%` }} />
            <div
              className="relative h-1.5 rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-primary shadow-lg transition-transform group-hover:scale-125"
            style={{ left: `calc(${progressPct}% - 7px)` }}
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className={tapSize} aria-label={playing ? "Pausar" : "Reproduzir"}
            onClick={() => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause(); }}>
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button size="icon" variant="ghost" className={tapSize} aria-label="Voltar 10 segundos" onClick={() => skip(-10)}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" className={tapSize} aria-label="Avançar 10 segundos" onClick={() => skip(10)}>
            <RotateCw className="h-5 w-5" />
          </Button>

          <div className="ml-1 flex items-center gap-2">
            <Button size="icon" variant="ghost" className={tapSize} aria-label={muted ? "Ativar som" : "Silenciar"}
              onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            {!isMobile && (
              <input
                type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.volume = Number(e.target.value);
                  v.muted = Number(e.target.value) === 0;
                }}
                className="h-1 w-24 accent-[var(--primary)]"
              />
            )}
          </div>

          <span className="ml-2 shrink-0 text-[11px] tabular-nums text-white/75 sm:text-xs">
            {fmt(current)} / {fmt(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {onNext && (
              <Button size="sm" variant="ghost" onClick={onNext} className="text-xs">
                Próximo
              </Button>
            )}
            <Button size="icon" variant="ghost" className={tapSize} aria-label="Tela cheia" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
