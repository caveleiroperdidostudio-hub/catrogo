import { useEffect, useState } from "react";
import { ArrowLeft, Rocket, Sparkles, Clock, Monitor, Smartphone } from "lucide-react";
import { useCtrgUi, APP_VERSION, uiLabel } from "@/lib/ctrg-ui";
import { supabase } from "@/integrations/supabase/client";

type MuseumVersion = {
  id: string;
  app_version: string;
  label: string;
  released_at: string | null;
  summary: string | null;
  ui_version: string | null;
  playable: boolean;
  sort_order: number;
};

/** Versões de fallback caso o banco não tenha dados ainda. */
const FALLBACK_VERSIONS: MuseumVersion[] = [
  { id: "4", app_version: "4.0.0", label: "CatroGo 4.0", released_at: "2026-09-06", summary: "Ctrg UI: novo sistema de design, Museu, IA com navegação", ui_version: "4.0", playable: true, sort_order: 0 },
  { id: "3", app_version: "3.4.0", label: "CatroGo 3.4", released_at: "2026-09-01", summary: "Chat completo: criptografia, anexos e figurinhas", ui_version: null, playable: true, sort_order: 1 },
  { id: "2", app_version: "3.0.0", label: "CatroGo 3.0", released_at: "2026-07-15", summary: "Hiper atualização: IA, chamadas e painel de design", ui_version: null, playable: true, sort_order: 2 },
  { id: "1", app_version: "2.0.0", label: "CatroGo 2.0", released_at: "2026-07-01", summary: "Mods, modpacks e eventos globais", ui_version: null, playable: true, sort_order: 3 },
  { id: "0", app_version: "1.0.0", label: "CatroGo 1.0", released_at: "2026-06-01", summary: "Lançamento: chat, vídeos, shorts, games e loja", ui_version: null, playable: true, sort_order: 4 },
];

/** Representação visual de uma versão histórica — isolada e somente leitura. */
function VersionPreview({ version }: { version: MuseumVersion }) {
  const major = version.app_version.charAt(0);

  // Cada versão tem um visual diferente para demonstrar a evolução
  const styles: Record<string, { bg: string; nav: string; accent: string; cardStyle: string }> = {
    "1": { bg: "oklch(0.14 0.02 250)", nav: "oklch(0.2 0.02 250)", accent: "#3B82F6", cardStyle: "rounded-lg" },
    "2": { bg: "oklch(0.13 0.03 270)", nav: "oklch(0.19 0.03 270)", accent: "#8B5CF6", cardStyle: "rounded-xl" },
    "3": { bg: "oklch(0.12 0.03 280)", nav: "oklch(0.18 0.035 280)", accent: "#7C3AED", cardStyle: "rounded-2xl" },
    "4": { bg: "oklch(0.13 0.03 280)", nav: "oklch(0.17 0.035 280 / 0.7)", accent: "var(--primary)", cardStyle: "rounded-2xl" },
  };
  const s = styles[major] ?? styles["4"];

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: s.bg }}>
      {/* Header antigo */}
      <div className="h-14 shrink-0 flex items-center px-4 border-b border-white/5" style={{ background: s.nav }}>
        <span className="font-semibold text-sm" style={{ color: s.accent }}>{version.label}</span>
        <span className="ml-auto text-[10px] text-white/40">Museu — somente leitura</span>
      </div>

      {/* Conteúdo de demonstração */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center py-6">
          <div
            className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: s.accent }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold">{version.label}</h2>
          {version.ui_version && (
            <p className="text-xs text-white/40 mt-1">Ctrg UI {version.ui_version}</p>
          )}
          <p className="text-sm text-white/50 mt-2 max-w-xs mx-auto">{version.summary}</p>
          {version.released_at && (
            <p className="text-[11px] text-white/30 mt-2">
              {new Date(version.released_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Mock de navegação antiga */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`p-3 ${s.cardStyle} border border-white/5 flex items-center gap-3`}
              style={{ background: s.nav }}
            >
              <div className="h-10 w-10 rounded-xl" style={{ background: `${s.accent}33` }} />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                <div className="h-2 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Mock de chat antigo */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-start">
            <div className={`max-w-[75%] ${s.cardStyle} px-3 py-2 text-xs`} style={{ background: "rgba(255,255,255,0.08)" }}>
              Mensagem recebida — demonstração visual
            </div>
          </div>
          <div className="flex justify-end">
            <div className={`max-w-[75%] ${s.cardStyle} px-3 py-2 text-xs text-white`} style={{ background: `${s.accent}cc` }}>
              Mensagem enviada — demonstração visual
            </div>
          </div>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[11px] text-white/30">
            Esta é uma representação visual de como o CatroGo era nesta versão.
            <br />Funcionalidades reais não estão disponíveis no Museu.
          </p>
        </div>
      </div>

      {/* Nav antiga mock */}
      <div
        className="h-14 shrink-0 flex items-center justify-around border-t border-white/5 px-2"
        style={{ background: s.nav }}
      >
        {["Chat", "Vídeos", "Games", "Loja", "Perfil"].map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <div className="h-5 w-5 rounded" style={{ background: i === 0 ? s.accent : "rgba(255,255,255,0.2)" }} />
            <span className="text-[9px]" style={{ color: i === 0 ? s.accent : "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MuseumModule() {
  const { info } = useCtrgUi();
  const [versions, setVersions] = useState<MuseumVersion[]>(FALLBACK_VERSIONS);
  const [selected, setSelected] = useState<MuseumVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("museum_versions")
      .select("id, app_version, label, released_at, summary, ui_version, playable, sort_order")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setVersions(data as MuseumVersion[]);
        setLoading(false);
      });
  }, []);

  if (selected) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-white/5 bg-background/80 backdrop-blur">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao Museu
          </button>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Você está visualizando: {selected.label}
            {selected.ui_version && ` • Ctrg UI ${selected.ui_version}`}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <VersionPreview version={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-14 shrink-0 px-4 flex items-center gap-2 border-b border-white/5">
        <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center cosmic-glow">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">Museu</div>
          <div className="text-[11px] text-muted-foreground">Viaje pelo tempo do CatroGo</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Banner da versão atual */}
        <div className="rounded-2xl glass border border-primary/25 p-4 flex items-center gap-3">
          <Monitor className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Versão atual</div>
            <div className="text-xs text-muted-foreground">
              CatroGo {APP_VERSION} • {uiLabel(info)}
            </div>
          </div>
        </div>

        {/* Lista de versões históricas */}
        <h3 className="ctrg-section-title px-1 pt-2">Versões históricas</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          versions.map((v) => (
            <button
              key={v.id}
              onClick={() => v.playable && setSelected(v)}
              disabled={!v.playable}
              className={`w-full text-left rounded-2xl glass border border-white/10 p-4 transition ${
                v.playable ? "hover:border-primary/30 cursor-pointer" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{v.label}</span>
                    {v.ui_version && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Ctrg UI {v.ui_version}
                      </span>
                    )}
                  </div>
                  {v.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.summary}</p>}
                  {v.released_at && (
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {new Date(v.released_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                {v.playable && <Smartphone className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
              </div>
            </button>
          ))
        )}

        <div className="pt-2 text-center">
          <p className="text-[11px] text-muted-foreground/60">
            O Museu é uma experiência de visualização. As versões históricas
            <br />não recebem permissões especiais e não modificam seus dados.
          </p>
        </div>
      </div>
    </div>
  );
}
