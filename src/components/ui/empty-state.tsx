import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vazio elegante e reutilizável.
 * Usa a display font, ícone em halo cósmico e animação de entrada suave.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "page-transition flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/10 border border-primary/20 cosmic-glow">
          <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
