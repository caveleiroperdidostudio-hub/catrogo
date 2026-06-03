import { useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Music2, Play, Pause } from "lucide-react";

type Short = {
  id: string;
  author: string;
  caption: string;
  likes: string;
  comments: string;
  sound: string;
  hue: number;
};

const SHORTS: Short[] = [
  { id: "1", author: "@nova", caption: "POV: você acorda em outra galáxia 🌌", likes: "12,4k", comments: "320", sound: "som original — nova", hue: 295 },
  { id: "2", author: "@catrogo", caption: "Editando vídeo em 15s no Catrogo ⚡", likes: "8,1k", comments: "210", sound: "Beat Espacial — DJ Orbit", hue: 215 },
  { id: "3", author: "@astro", caption: "Truque de física que ninguém te contou", likes: "44,9k", comments: "1,2k", sound: "som original — astro", hue: 330 },
  { id: "4", author: "@luna", caption: "Dança da lua cheia 🌙✨", likes: "27,3k", comments: "880", sound: "Lunar Vibes — luna", hue: 190 },
];

function ShortCard({ short }: { short: Short }) {
  const [liked, setLiked] = useState(false);
  const [paused, setPaused] = useState(false);
  return (
    <div
      className="relative h-full w-full shrink-0 snap-start snap-always flex items-end"
      style={{ background: `radial-gradient(circle at 50% 35%, oklch(0.4 0.2 ${short.hue} / 0.65), oklch(0.1 0.04 280))` }}
    >
      <button
        onClick={() => setPaused((p) => !p)}
        className="absolute inset-0 flex items-center justify-center"
        aria-label="play/pause"
      >
        {paused ? <Play className="h-16 w-16 text-white/80" fill="currentColor" /> : <Pause className="h-12 w-12 text-white/0" />}
      </button>

      <div className="relative z-10 flex w-full items-end justify-between p-4 pb-6">
        <div className="max-w-[75%] space-y-2 text-white">
          <p className="font-semibold">{short.author}</p>
          <p className="text-sm opacity-90">{short.caption}</p>
          <p className="text-xs opacity-80 flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5" />{short.sound}
          </p>
        </div>
        <div className="flex flex-col items-center gap-5 text-white">
          <button onClick={() => setLiked((l) => !l)} className="flex flex-col items-center gap-1">
            <Heart className={`h-7 w-7 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs">{short.likes}</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <MessageCircle className="h-7 w-7" />
            <span className="text-xs">{short.comments}</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Share2 className="h-7 w-7" />
            <span className="text-xs">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShortsModule() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="h-full w-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-black"
    >
      {SHORTS.map((s) => (
        <div key={s.id} className="h-full w-full">
          <ShortCard short={s} />
        </div>
      ))}
    </div>
  );
}
