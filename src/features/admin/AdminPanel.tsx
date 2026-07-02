import { useState } from "react";
import { ShieldCheck, Sparkles, Timer, Infinity as InfinityIcon, Loader2, Snowflake, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGlobalEvent, startEvent, stopEvent, formatCountdown } from "@/lib/events-context";

type Unit = "seconds" | "minutes" | "hours" | "days";

const UNIT_SECONDS: Record<Unit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
};

const UNIT_LABEL: Record<Unit, string> = {
  seconds: "Segundos",
  minutes: "Minutos",
  hours: "Horas",
  days: "Dias",
};

export function AdminPanel() {
  const { event, remainingMs, refresh } = useGlobalEvent();
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<Unit>("hours");
  const [busy, setBusy] = useState(false);

  const durationSeconds = Math.max(1, Math.round(amount * UNIT_SECONDS[unit]));

  const handleStart = async () => {
    setBusy(true);
    try {
      await startEvent("christmas", "Evento de Natal 🎄", durationSeconds);
      await refresh();
      toast.success("Evento de Natal iniciado para todos os usuários! 🎄");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível iniciar o evento");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!event) return;
    setBusy(true);
    try {
      await stopEvent(event.id);
      await refresh();
      toast.success("Evento encerrado.");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao encerrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/5">
        <ShieldCheck className="h-5 w-5 text-amber-400" />
        <span className="font-semibold flex-1">Comandos (Dono)</span>
        <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
          <InfinityIcon className="h-4 w-4" /> Saldo infinito
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Active event */}
        {event && (
          <div className="rounded-2xl glass border border-emerald-500/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-sky-300 animate-pulse" />
              <div className="flex-1">
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted-foreground">Ativo agora para todos os usuários</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2">
              <Timer className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-sm">{formatCountdown(remainingMs)}</span>
              <span className="text-xs text-muted-foreground ml-auto">tempo restante</span>
            </div>
            <Button variant="destructive" className="w-full" onClick={handleStop} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Power className="h-4 w-4 mr-1" /> Encerrar evento agora</>}
            </Button>
          </div>
        )}

        {/* Duration selector */}
        <div className="rounded-2xl glass border border-white/10 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="font-semibold">Disparar evento global</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tempo limite de duração</p>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-24 bg-black/30 border-white/10"
              />
              <div className="grid grid-cols-4 gap-1 flex-1">
                {(Object.keys(UNIT_SECONDS) as Unit[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`rounded-md py-2 text-[11px] font-medium transition ${
                      unit === u ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {UNIT_LABEL[u]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Duração total: <span className="text-foreground font-mono">{formatCountdown(durationSeconds * 1000)}</span>
            </p>
          </div>

          <Button className="w-full" onClick={handleStart} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Snowflake className="h-4 w-4 mr-1" /> Iniciar Evento de Natal</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            O tema natalino e a aba de missões aparecem para todos até o cronômetro zerar.
          </p>
        </div>
      </div>
    </div>
  );
}
