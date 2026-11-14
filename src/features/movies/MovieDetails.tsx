import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signedUrl } from "@/lib/media";
import { Clock, Eye, Heart, Play, Star } from "lucide-react";
import type { Movie, MovieProgress } from "./types";

const position = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Ficha do filme: sinopse, créditos, retomada e "minha lista". */
export function MovieDetails({
  movie,
  favorite,
  progress,
  onToggleFavorite,
  onPlay,
  onClose,
}: {
  movie: Movie;
  favorite: boolean;
  progress?: MovieProgress;
  onToggleFavorite: () => void;
  onPlay: () => void;
  onClose: () => void;
}) {
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    if (!movie.poster_url) { setPoster(null); return; }
    if (/^https?:/.test(movie.poster_url)) { setPoster(movie.poster_url); return; }
    let alive = true;
    signedUrl("movies", movie.poster_url).then((u) => { if (alive) setPoster(u); });
    return () => { alive = false; };
  }, [movie.poster_url]);

  const resume = progress && progress.pos > 30 ? progress : null;
  const pct = resume && resume.dur > 0 ? Math.min(100, Math.round((resume.pos / resume.dur) * 100)) : 0;
  const cast = movie.cast_names?.filter(Boolean) ?? [];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <div className="relative">
          {poster ? (
            <img src={poster} alt={`Pôster de ${movie.title}`} className="h-44 w-full object-cover" />
          ) : (
            <div className="h-44 w-full bg-gradient-to-br from-primary/25 to-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-x-4 bottom-3">
            <h2 className="font-display text-lg font-semibold leading-tight text-foreground">{movie.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span>{movie.category}</span>
              {movie.year ? <span>· {movie.year}</span> : null}
              {movie.duration_min ? (
                <span className="inline-flex items-center gap-1">
                  · <Clock className="h-3 w-3" aria-hidden="true" /> {movie.duration_min} min
                </span>
              ) : null}
              {movie.age_rating ? (
                <span className="rounded border border-white/20 px-1 leading-4">{movie.age_rating}</span>
              ) : null}
              {typeof movie.rating === "number" ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary" aria-hidden="true" /> {movie.rating.toFixed(1)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" aria-hidden="true" /> {movie.views}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-5 pt-3">
          {movie.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{movie.description}</p>
          ) : null}

          {(movie.director || cast.length > 0) && (
            <dl className="space-y-1 text-xs text-muted-foreground">
              {movie.director ? (
                <div>
                  <dt className="inline font-medium text-foreground">Direção: </dt>
                  <dd className="inline">{movie.director}</dd>
                </div>
              ) : null}
              {cast.length > 0 ? (
                <div>
                  <dt className="inline font-medium text-foreground">Elenco: </dt>
                  <dd className="inline">{cast.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          )}

          {resume ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Você parou em {position(resume.pos)}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button className="cosmic-glow flex-1" onClick={onPlay}>
              <Play className="mr-1 h-4 w-4" aria-hidden="true" /> {resume ? "Continuar" : "Assistir"}
            </Button>
            <Button
              variant="secondary"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? "Remover da minha lista" : "Adicionar à minha lista"}
            >
              <Heart className={favorite ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
