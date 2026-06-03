import { useCallback, useRef, useState } from "react";

type Phase = "idle" | "waiting" | "ready" | "result" | "tooSoon";

export function ReactionGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    setPhase("waiting");
    const delay = 1200 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }, []);

  const click = useCallback(() => {
    if (phase === "idle" || phase === "result" || phase === "tooSoon") {
      start();
    } else if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("tooSoon");
    } else if (phase === "ready") {
      const took = Math.round(performance.now() - startRef.current);
      setMs(took);
      setBest((b) => (b === null ? took : Math.min(b, took)));
      setPhase("result");
    }
  }, [phase, start]);

  const bg =
    phase === "ready"
      ? "oklch(0.6 0.2 145)"
      : phase === "waiting"
      ? "oklch(0.45 0.2 30)"
      : "oklch(0.2 0.05 280)";

  return (
    <button
      onClick={click}
      className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6 transition-colors"
      style={{ background: bg }}
    >
      {phase === "idle" && (
        <>
          <p className="text-2xl font-bold text-white">Reflexo Cósmico</p>
          <p className="text-white/80">Toque para começar. Quando ficar verde, toque o mais rápido que puder!</p>
        </>
      )}
      {phase === "waiting" && <p className="text-2xl font-bold text-white">Espere o verde…</p>}
      {phase === "ready" && <p className="text-3xl font-bold text-white">TOQUE!</p>}
      {phase === "tooSoon" && (
        <>
          <p className="text-2xl font-bold text-white">Cedo demais! 🚀</p>
          <p className="text-white/80">Toque para tentar de novo.</p>
        </>
      )}
      {phase === "result" && (
        <>
          <p className="text-4xl font-extrabold text-white">{ms} ms</p>
          {best !== null && <p className="text-white/80">Melhor: {best} ms</p>}
          <p className="text-white/80 mt-2">Toque para jogar de novo.</p>
        </>
      )}
    </button>
  );
}
