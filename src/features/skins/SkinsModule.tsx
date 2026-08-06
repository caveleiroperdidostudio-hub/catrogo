import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Shirt, Check, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type SkinConfig = { hue: number; body: string; eyes: string; aura: string };
type Skin = { id: string; name: string; config: SkinConfig; accessories: string[]; is_active: boolean };

const BODIES = ["gato", "robô", "alien", "fantasma"];
const EYES = ["redondos", "felinos", "brilhantes", "visor"];
const AURAS = ["nenhuma", "estelar", "nebulosa", "supernova"];
const ACCESSORIES = ["chapéu", "óculos", "capa", "mochila a jato", "coroa", "fones", "cachecol", "asas"];

const DEFAULT: SkinConfig = { hue: 285, body: "gato", eyes: "redondos", aura: "estelar" };

function SkinAvatar({ config, accessories, size = 120 }: { config: SkinConfig; accessories: string[]; size?: number }) {
  const glow = config.aura === "nenhuma" ? "none" : `0 0 ${config.aura === "supernova" ? 48 : 28}px hsl(${config.hue} 90% 60% / 0.65)`;
  return (
    <div
      className="relative flex items-center justify-center rounded-3xl border border-white/10"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, hsl(${config.hue} 85% 62%), hsl(${(config.hue + 60) % 360} 70% 28%))`,
        boxShadow: glow,
      }}
      aria-label="Prévia da skin"
    >
      <div className="flex gap-2">
        <span className="block h-3 w-3 rounded-full bg-white/90" style={{ borderRadius: config.eyes === "felinos" ? "40% 60%" : "9999px" }} />
        <span className="block h-3 w-3 rounded-full bg-white/90" style={{ borderRadius: config.eyes === "felinos" ? "60% 40%" : "9999px" }} />
      </div>
      <span className="absolute bottom-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">{config.body}</span>
      {accessories.length > 0 && (
        <span className="absolute -top-2 rounded-full bg-background/80 px-2 text-[10px] text-primary">{accessories.length} itens</span>
      )}
    </div>
  );
}

/** Criação de skins com acessórios (opcional para cada usuário). */
export function SkinsModule() {
  const { user } = useAuth();
  const [skins, setSkins] = useState<Skin[]>([]);
  const [name, setName] = useState("Minha skin");
  const [config, setConfig] = useState<SkinConfig>(DEFAULT);
  const [acc, setAcc] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("skins")
      .select("id, name, config, accessories, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSkins(
      ((data ?? []) as { id: string; name: string; config: unknown; accessories: unknown; is_active: boolean }[]).map((s) => ({
        id: s.id,
        name: s.name,
        is_active: s.is_active,
        config: { ...DEFAULT, ...(s.config as SkinConfig) },
        accessories: Array.isArray(s.accessories) ? (s.accessories as string[]) : [],
      })),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("skins").insert({
      user_id: user.id,
      name: name.trim() || "Minha skin",
      config: config as unknown as Record<string, unknown>,
      accessories: acc,
      is_active: skins.length === 0,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Skin criada!");
    await load();
  };

  const activate = async (id: string) => {
    if (!user) return;
    await supabase.from("skins").update({ is_active: false }).eq("user_id", user.id);
    await supabase.from("skins").update({ is_active: true }).eq("id", id);
    await load();
    toast.success("Skin ativada");
  };

  const remove = async (id: string) => {
    await supabase.from("skins").delete().eq("id", id);
    await load();
  };

  const toggleAcc = (a: string) => setAcc((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-4">
        <div className="cosmic-glow flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/20">
          <Shirt className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">Skins</div>
          <div className="text-[11px] text-muted-foreground">Crie o seu avatar cósmico (opcional)</div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="glass flex flex-col items-center gap-4 rounded-2xl border border-white/10 p-4">
          <SkinAvatar config={config} accessories={acc} />
          <div className="w-full space-y-3">
            <div className="space-y-1.5">
              <Label>Nome da skin</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor ({config.hue}°)</Label>
              <Slider value={[config.hue]} min={0} max={359} onValueChange={([v]) => setConfig({ ...config, hue: v })} />
            </div>
            {[
              { key: "body" as const, label: "Corpo", options: BODIES },
              { key: "eyes" as const, label: "Olhos", options: EYES },
              { key: "aura" as const, label: "Aura", options: AURAS },
            ].map((row) => (
              <div key={row.key} className="space-y-1.5">
                <Label>{row.label}</Label>
                <div className="flex flex-wrap gap-2">
                  {row.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => setConfig({ ...config, [row.key]: o })}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        config[row.key] === o ? "border-primary/50 bg-primary/20 text-primary" : "border-white/10 text-muted-foreground"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Acessórios</Label>
              <div className="flex flex-wrap gap-2">
                {ACCESSORIES.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAcc(a)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      acc.includes(a) ? "border-primary/50 bg-primary/20 text-primary" : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={save} disabled={busy} className="cosmic-glow w-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Salvar skin
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Minhas skins</h3>
          {skins.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não criou nenhuma skin.</p>}
          {skins.map((s) => (
            <div key={s.id} className="glass flex items-center gap-3 rounded-2xl border border-white/10 p-3">
              <SkinAvatar config={s.config} accessories={s.accessories} size={56} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.accessories.length} acessórios {s.is_active ? "· ativa" : ""}
                </div>
              </div>
              {!s.is_active && (
                <Button size="sm" variant="ghost" onClick={() => activate(s.id)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
