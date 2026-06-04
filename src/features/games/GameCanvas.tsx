import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseNewcatroid, runNewcatroid, type RuntimeHandle } from "@/lib/newcatroid";

export function GameCanvas({ code, width = 320, height = 320 }: { code: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<RuntimeHandle | null>(null);
  const [score, setScore] = useState(0);
  const [endMsg, setEndMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parsed = parseNewcatroid(code);
    setErrors(parsed.errors);
    setScore(0);
    setEndMsg(null);
    if (parsed.errors.length > 0) return;

    handleRef.current = runNewcatroid(canvas, parsed, {
      onScore: setScore,
      onEnd: (m) => setEndMsg(m),
    });
    return () => handleRef.current?.stop();
  }, [code, round]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ width, height }}>
        <canvas ref={canvasRef} width={width} height={height} className="block" tabIndex={0} />
        <div className="absolute top-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-mono text-white">
          Pontos: {score}
        </div>
        {endMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center px-4">
            <p className="text-lg font-bold text-white">{endMsg}</p>
            <p className="text-sm text-white/70">Pontuação final: {score}</p>
            <Button size="sm" onClick={() => setRound((r) => r + 1)}>
              <RotateCcw className="h-4 w-4 mr-1" /> Jogar de novo
            </Button>
          </div>
        )}
        {errors.length > 0 && (
          <div className="absolute inset-0 overflow-auto bg-black/80 p-3 text-left text-xs text-red-300 font-mono space-y-1">
            <p className="text-red-400 font-semibold">Erros no código:</p>
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Use as setas do teclado para jogar. Toque no quadro primeiro.</p>
    </div>
  );
}
