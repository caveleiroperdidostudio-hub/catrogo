import { useState } from "react";
import { X, Palette, Gift, Clock, Wand2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { startEvent } from "@/lib/events-context";

export type EventDraft = {
  name: string;
  missions: { key: string; label: string; coins: number }[];
  durationHours: number;
  primary: string;
  accent: string;
  background: string;
};

const PRESETS: { label: string; primary: string; accent: string; background: string }[] = [
  { label: "Natal", primary: "#e63946", accent: "#2a9d8f", background: "#0b1a12" },
  { label: "Halloween", primary: "#ff7b00", accent: "#8338ec", background: "#160b1e" },
  { label: "Verão", primary: "#00b4d8", accent: "#ffb703", background: "#04202b" },
  { label: "Neon", primary: "#f72585", accent: "#4cc9f0", background: "#0b0b1e" },
];

/** Applies the event theme colors to the document root for the session. */
export function applyEventTheme(d: { primary: string; accent: string; background: string } | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!d) {
    root.style.removeProperty("--event-primary");
    root.style.removeProperty("--event-accent");
    root.style.removeProperty("--event-bg");
    return;
  }
  root.style.setProperty("--event-primary", d.primary);
  root.style.setProperty("--event-accent", d.accent);
  root.style.setProperty("--event-bg", d.background);
}

export function EventDesignModal({
  initial,
  onClose,
  onCreated,
}: {
  initial: Partial<EventDraft>;
  onClose: () => void;
  onCreated: (msg: string) => void;
}) {
  const [name, setName] = useState(initial.name ?? "Novo Evento");
  const [durationHours, setDurationHours] = useState(initial.durationHours ?? 24);
  const [primary, setPrimary] = useState(initial.primary ?? "#e63946");
  const [accent, setAccent] = useState(initial.accent ?? "#2a9d8f");
  const [background, setBackground] = useState(initial.background ?? "#0b1a12");
  const [missions, setMissions] = useState<EventDraft["missions"]>(
    initial.missions && initial.missions.length
      ? initial.missions
      : [{ key: "missao-1", label: "Complete a missão 1", coins: 500 }],
  );
  const [busy, setBusy] = useState(false);

  const addMission = () =>
    setMissions((m) => [...m, { key: `missao-${m.length + 1}`, label: `Complete a missão ${m.length + 1}`, coins: 500 }]);
  const removeMission = (i: number) => setMissions((m) => m.filter((_, idx) => idx !== i));
  const updateMission = (i: number, patch: Partial<EventDraft["missions"][number]>) =>
    setMissions((m) => m.map((mm, idx) => (idx === i ? { ...mm, ...patch } : mm)));

  const create = async () => {
    if (!name.trim()) return toast.error("Dê um nome ao evento");
    setBusy(true);
    try {
      const kind = /natal|christmas/i.test(name) ? "christmas" : name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "evento";
      // persiste a configuração visual/recompensas do evento para a sessão
      try {
        localStorage.setItem(`catrogo-event-${kind}`, JSON.stringify({ name, missions, primary, accent, background }));
      } catch {
        /* ignore */
      }
      applyEventTheme({ primary, accent, background });
      await startEvent(kind, name.trim(), durationHours * 3600);
      onCreated(`✅ Evento "${name}" criado com ${missions.length} missão(ões), duração ${durationHours}h.`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 h-12 border-b border-white/10 bg-zinc-950">
          <Wand2 className="h-5 w-5 text-primary" />
          <span className="font-semibold flex-1">Painel de Design de Eventos</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <label className="text-xs text-muted-foreground">Nome do evento</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Palette className="h-4 w-4 text-primary" /> Tema visual
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setPrimary(p.primary);
                    setAccent(p.accent);
                    setBackground(p.background);
                  }}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/10 flex items-center gap-1.5"
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: p.primary }} />
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["Primária", primary, setPrimary],
                ["Destaque", accent, setAccent],
                ["Fundo", background, setBackground],
              ] as const).map(([label, val, setter]) => (
                <label key={label} className="text-xs text-muted-foreground">
                  {label}
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                    <input type="color" value={val} onChange={(e) => setter(e.target.value)} className="h-6 w-6 rounded cursor-pointer bg-transparent" />
                    <span className="font-mono text-[11px]">{val}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium mb-1">
              <Clock className="h-4 w-4 text-primary" /> Duração (horas)
            </div>
            <Input
              type="number"
              min={1}
              value={durationHours}
              onChange={(e) => setDurationHours(Math.max(1, parseInt(e.target.value || "1", 10)))}
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Missions + rewards */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Gift className="h-4 w-4 text-primary" /> Missões e recompensas
            </div>
            {missions.map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                <Input
                  value={m.label}
                  onChange={(e) => updateMission(i, { label: e.target.value })}
                  placeholder="Descrição da missão"
                  className="flex-1 h-8 bg-transparent border-white/10 text-sm"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={m.coins}
                    onChange={(e) => updateMission(i, { coins: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                    className="w-20 h-8 bg-transparent border-white/10 text-sm"
                  />
                  <span className="text-[11px] text-muted-foreground">CC</span>
                </div>
                <button onClick={() => removeMission(i)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={addMission} className="text-primary">
              <Plus className="h-4 w-4 mr-1" /> Adicionar missão
            </Button>
          </div>

          <Button className="w-full" onClick={create} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Iniciar evento para todos
          </Button>
        </div>
      </div>
    </div>
  );
}
