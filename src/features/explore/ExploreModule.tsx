import { useState } from "react";
import {
  Package, BadgeCheck, Clock, Rocket, ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { ModsModule } from "@/features/mods/ModsModule";
import { VerificationModule } from "@/features/verification/VerificationModule";
import { MuseumModule } from "@/features/museum/MuseumModule";
import { UpdatesModule } from "@/features/updates/UpdatesModule";

type SectionId = "mods" | "verify" | "museum" | "updates";

type Section = {
  id: SectionId;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
};

const SECTIONS: Section[] = [
  { id: "mods", label: "Mods", desc: "Explore, crie e instale mods da comunidade", icon: Package, color: "oklch(0.72 0.16 215)" },
  { id: "verify", label: "Selos", desc: "Solicite selos de verificação e identidade", icon: BadgeCheck, color: "oklch(0.7 0.15 230)" },
  { id: "museum", label: "Museu", desc: "Viaje pelo tempo do CatroGo", icon: Clock, color: "oklch(0.65 0.2 295)" },
  { id: "updates", label: "Novidades", desc: "Veja o que mudou a cada versão", icon: Rocket, color: "oklch(0.78 0.18 70)" },
];

export function ExploreModule() {
  const [active, setActive] = useState<SectionId | null>(null);

  if (active === "mods") {
    return <SectionWrapper title="Mods" onBack={() => setActive(null)}><ModsModule /></SectionWrapper>;
  }
  if (active === "verify") {
    return <SectionWrapper title="Selos" onBack={() => setActive(null)}><VerificationModule /></SectionWrapper>;
  }
  if (active === "museum") {
    return <SectionWrapper title="Museu" onBack={() => setActive(null)}><MuseumModule /></SectionWrapper>;
  }
  if (active === "updates") {
    return <SectionWrapper title="Novidades" onBack={() => setActive(null)}><UpdatesModule /></SectionWrapper>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-14 shrink-0 px-4 flex items-center gap-2 border-b border-white/5">
        <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center cosmic-glow">
          <Rocket className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">Explorar</div>
          <div className="text-[11px] text-muted-foreground">Mods, selos, museu e novidades</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className="w-full text-left rounded-2xl glass border border-white/10 p-4 transition hover:border-primary/30 card-interactive"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    background: `color-mix(in oklab, ${s.color} 15%, transparent)`,
                    borderColor: `color-mix(in oklab, ${s.color} 35%, transparent)`,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{s.desc}</div>
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionWrapper({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-white/5 bg-background/80 backdrop-blur">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" /> Explorar
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
