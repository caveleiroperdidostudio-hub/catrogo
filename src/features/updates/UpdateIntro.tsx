import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMotion } from "@/lib/motion-context";
import type { ChangelogVersion } from "@/features/updates/UpdatesModule";

/**
 * Animação de boas-vindas exibida quando o app abre numa versão nova:
 * apresenta o que chegou, o que foi corrigido e as opções novas.
 */
export function UpdateIntro({ version, onClose }: { version: ChangelogVersion; onClose: () => void }) {
  const { prefs } = useMotion();
  const animate = prefs.enabled;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!animate) {
      setStep(version.changes.length);
      return;
    }
    if (step >= version.changes.length) return;
    const timer = window.setTimeout(() => setStep((s) => s + 1), 260);
    return () => window.clearTimeout(timer);
  }, [animate, step, version.changes.length]);

  return (
    <div
      className={`nuv-intro ${animate ? "nuv-intro--animated" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Novidades da versão ${version.version}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-black/30 p-2 text-white/70 backdrop-blur transition hover:text-white"
        aria-label="Fechar novidades"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="nuv-intro__aurora" aria-hidden="true" />
      <div className="nuv-intro__orbit" aria-hidden="true">
        <span className="nuv-intro__ring" />
        <span className="nuv-intro__core" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-5 px-6">
        <header className="space-y-1 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
            <Sparkles className="h-3 w-3" /> Atualização {version.version}
          </div>
          <h2 className="font-display text-2xl font-semibold text-white">{version.title}</h2>
          <p className="text-xs text-white/60">{version.date}</p>
        </header>

        <ul className="space-y-2">
          {version.changes.slice(0, 6).map((change, i) => (
            <li
              key={change.text}
              className={`nuv-intro__item ${i < step ? "is-in" : ""}`}
              style={{ transitionDelay: animate ? `${i * 90}ms` : "0ms" }}
            >
              <span className={`nuv-intro__tag nuv-intro__tag--${change.type}`}>{change.type}</span>
              <span className="text-sm text-white/85">{change.text}</span>
            </li>
          ))}
        </ul>

        <Button className="w-full gap-2 cosmic-glow" onClick={onClose}>
          Começar a usar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
