import { useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void>; addEventListener: (t: string, cb: () => void) => void };

/**
 * Mantém a tela ligada enquanto `active` for verdadeiro.
 * Usa a Wake Lock API quando disponível; senão, usa um vídeo silencioso
 * em loop como alternativa (fallback aceito pelos navegadores móveis).
 * Libera o bloqueio automaticamente ao sair/desmontar.
 */
export function useWakeLock(active: boolean) {
  const sentinel = useRef<WakeLockSentinelLike | null>(null);
  const fallbackVideo = useRef<HTMLVideoElement | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const releaseAll = () => {
      sentinel.current?.release().catch(() => {});
      sentinel.current = null;
      if (fallbackVideo.current) {
        fallbackVideo.current.pause();
        fallbackVideo.current.remove();
        fallbackVideo.current = null;
      }
    };

    const startFallback = () => {
      if (fallbackVideo.current) return;
      const v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("aria-hidden", "true");
      v.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px";
      // vídeo mínimo (1 frame) embutido — nenhuma requisição de rede
      v.src =
        "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAr1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCAtIEguMjY0L01QRUctNCBBVkMgY29kZWMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      document.body.appendChild(v);
      fallbackVideo.current = v;
      v.play().catch(() => {});
    };

    const request = async () => {
      const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
      if (wl) {
        try {
          const s = await wl.request("screen");
          if (cancelled) {
            s.release().catch(() => {});
            return;
          }
          sentinel.current = s;
          s.addEventListener("release", () => {
            sentinel.current = null;
          });
          return;
        } catch {
          /* cai no fallback */
        }
      }
      if (!cancelled) startFallback();
    };

    if (active) {
      request();
      const onVisible = () => {
        if (document.visibilityState === "visible" && active && !sentinel.current) request();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisible);
        releaseAll();
      };
    }

    releaseAll();
    return () => {
      cancelled = true;
      releaseAll();
    };
  }, [active]);

  return { supported };
}
