import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/** Pôster do filme: aceita URL pública ou caminho no bucket privado `movies`. */
export function MoviePoster({ path, title, className }: { path: string | null; title: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) { setUrl(null); return; }
    if (/^https?:/.test(path)) { setUrl(path); return; }
    let alive = true;
    signedUrl("movies", path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path]);

  if (!url)
    return (
      <div
        className={cn(
          "flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-white/5 p-1 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {title}
      </div>
    );
  return <img src={url} alt={`Pôster de ${title}`} loading="lazy" className={cn("aspect-[2/3] w-full rounded-xl object-cover", className)} />;
}
