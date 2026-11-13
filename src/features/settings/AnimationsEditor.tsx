import { useRef, useState } from "react";
import { Loader2, Play, Sparkles, Trash2, Upload, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useMotion } from "@/lib/motion-context";
import {
  INTENSITY_INFO, KIND_LABEL, MOTION_SLOTS, SLOT_INFO,
  type CustomAnimation, type MotionIntensity, type MotionSlot,
} from "@/lib/app-motion";

function SlotRow({ slot, animation }: { slot: MotionSlot; animation?: CustomAnimation }) {
  const { addAnimation, removeAnimation, preview } = useMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const info = SLOT_INFO[slot];

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await addAnimation({ file, slot });
      toast.success(`${info.label}: animação atualizada`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{info.label}</div>
          <div className="text-xs text-muted-foreground">{info.desc}</div>
        </div>
        {animation ? (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
            {KIND_LABEL[animation.kind]}
          </span>
        ) : (
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">padrão do app</span>
        )}
      </div>

      {animation && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="min-w-0 flex-1 truncate text-xs">{animation.name}</span>
          <button
            type="button"
            onClick={() => preview(animation)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label={`Testar ${animation.name}`}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void removeAnimation(animation.id)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
            aria-label={`Remover ${animation.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {animation ? "Trocar arquivo" : "Adicionar vídeo, foto ou som"}
      </Button>
    </div>
  );
}

export function AnimationsEditor() {
  const { prefs, setPrefs, animations } = useMotion();
  const bySlot = (slot: MotionSlot) => animations.find((a) => a.slot === slot);

  return (
    <div className="space-y-1">
      <h3 className="ctrg-section-title px-4 pt-4 pb-2">Animações do app</h3>

      <div className="px-4 py-2 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl glass border border-white/10 p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Ativar animações</div>
            <div className="text-xs text-muted-foreground">Movimentos, transições e microinterações</div>
          </div>
          <Switch checked={prefs.enabled} onCheckedChange={(v) => setPrefs({ enabled: v })} />
        </div>

        <div className={`rounded-2xl glass border border-white/10 p-4 space-y-3 transition-opacity ${prefs.enabled ? "" : "opacity-50"}`}>
          <div className="text-sm font-semibold">Intensidade</div>
          <div className="flex gap-2">
            {(["calm", "normal", "vivid"] as MotionIntensity[]).map((id) => (
              <button
                key={id}
                type="button"
                disabled={!prefs.enabled}
                onClick={() => setPrefs({ intensity: id })}
                className={`flex-1 rounded-xl border px-2 py-2 text-sm transition ${
                  prefs.intensity === id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground"
                }`}
              >
                {INTENSITY_INFO[id].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{INTENSITY_INFO[prefs.intensity].desc}</p>
        </div>
      </div>

      <h3 className="ctrg-section-title px-4 pt-4 pb-2">Minhas animações</h3>
      <p className="px-4 pb-2 text-xs text-muted-foreground">
        Escolha um vídeo, uma foto ou um som para cada momento do app. Os arquivos ficam só neste
        aparelho e só você vê o que editou.
      </p>
      <div className={`px-4 py-2 space-y-3 ${prefs.enabled ? "" : "opacity-50"}`}>
        {MOTION_SLOTS.map((slot) => (
          <SlotRow key={slot} slot={slot} animation={bySlot(slot)} />
        ))}
      </div>

      {animations.some((a) => (a.kind === "video" || a.kind === "sound")) && (
        <div className="px-4 py-2 space-y-3">
          <h3 className="ctrg-section-title pb-2">Volume e opacidade</h3>
          {animations.map((a) => <TuneRow key={a.id} animation={a} />)}
        </div>
      )}

      <div className="px-4 py-4">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <Volume2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Dica: vídeos curtos (até 6 segundos) funcionam melhor. Se o som não tocar, o navegador
          pode ter bloqueado o áudio automático.
        </p>
      </div>
    </div>
  );
}

function TuneRow({ animation }: { animation: CustomAnimation }) {
  const { updateAnimation, preview } = useMotion();
  const patch = (values: Partial<CustomAnimation>) => updateAnimation(animation.id, values);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{animation.name}</span>
        <button
          type="button"
          onClick={() => preview(animation)}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          aria-label={`Testar ${animation.name}`}
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      </div>
      {animation.kind !== "image" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Volume</span><span>{animation.volume}%</span>
          </div>
          <Slider
            value={[animation.volume]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => patch({ volume: v[0] })}
          />
        </div>
      )}
      {animation.kind !== "sound" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Opacidade</span><span>{animation.opacity}%</span>
          </div>
          <Slider
            value={[animation.opacity]}
            min={20}
            max={100}
            step={5}
            onValueChange={(v) => patch({ opacity: v[0] })}
          />
        </div>
      )}
    </div>
  );
}
