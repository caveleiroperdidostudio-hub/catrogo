import { Play } from "lucide-react";
import { MoviePoster } from "./MoviePoster";
import type { Movie, MovieProgress } from "./types";

/** Fileira horizontal de filmes (continuar assistindo / minha lista). */
export function MovieRail({
  title,
  items,
  progress,
  onOpen,
}: {
  title: string;
  items: Movie[];
  progress: Record<string, MovieProgress>;
  onOpen: (movie: Movie) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2" aria-label={title}>
      <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((movie) => {
          const saved = progress[movie.id];
          const pct = saved && saved.dur > 0 ? Math.min(100, Math.round((saved.pos / saved.dur) * 100)) : 0;
          return (
            <button key={movie.id} onClick={() => onOpen(movie)} className="tap-press w-24 shrink-0 text-left">
              <div className="relative">
                <MoviePoster path={movie.poster_url} title={movie.title} />
                {saved && (
                  <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-primary">
                    <Play className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
                {pct > 0 && (
                  <span className="absolute inset-x-1.5 bottom-1.5 block h-1 overflow-hidden rounded-full bg-black/60">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-xs font-medium">{movie.title}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
