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

/** Skeleton de card de vídeo (thumbnail 16:9 + meta com avatar). */
export function VideoCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="skeleton-shimmer aspect-video w-full rounded-2xl bg-primary/10" />
      <div className="flex gap-3">
        <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-full bg-primary/10" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-3.5 w-4/5 rounded bg-primary/10" />
          <div className="skeleton-shimmer h-3 w-1/3 rounded bg-primary/10" />
        </div>
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-5", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton de card genérico (loja, mods, packs). */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3", className)}>
      <div className="flex items-start gap-3">
        <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-xl bg-primary/10" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-3.5 w-1/2 rounded bg-primary/10" />
          <div className="skeleton-shimmer h-3 w-3/4 rounded bg-primary/10" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-3.5 w-16 rounded bg-primary/10" />
        <div className="skeleton-shimmer h-8 w-24 rounded-lg bg-primary/10" />
      </div>
    </div>
  );
}

export function CardListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

