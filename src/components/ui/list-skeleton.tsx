import { cn } from "@/lib/utils";

/** Uma linha de skeleton estilo item de lista (avatar + duas linhas). */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-3 border-b border-white/5", className)}>
      <div className="skeleton-shimmer h-12 w-12 rounded-full bg-primary/10" />
      <div className="flex-1 space-y-2">
        <div className="skeleton-shimmer h-3.5 w-1/3 rounded bg-primary/10" />
        <div className="skeleton-shimmer h-3 w-2/3 rounded bg-primary/10" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}
