import { useMemo, useState } from "react";
import { Search, Play, ThumbsUp, Eye, BellPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Video = {
  id: string;
  title: string;
  channel: string;
  views: string;
  age: string;
  duration: string;
  hue: number;
};

const VIDEOS: Video[] = [
  { id: "1", title: "Explorando nebulosas: tour 4K pela Via Láctea", channel: "Cosmos TV", views: "1,2 mi", age: "há 2 dias", duration: "12:40", hue: 280 },
  { id: "2", title: "Como criar um Super App do zero", channel: "Catrogo Dev", views: "340 mil", age: "há 1 semana", duration: "23:08", hue: 215 },
  { id: "3", title: "Lo-fi galáctico para focar e relaxar", channel: "Orbit Sounds", views: "8,9 mi", age: "há 3 meses", duration: "1:02:11", hue: 320 },
  { id: "4", title: "Os 10 maiores mistérios do universo", channel: "Astro Lab", views: "2,7 mi", age: "há 5 dias", duration: "18:55", hue: 190 },
  { id: "5", title: "Review: telescópios para iniciantes", channel: "StarGear", views: "120 mil", age: "há 1 mês", duration: "09:32", hue: 250 },
];

const CATEGORIES = ["Tudo", "Música", "Tecnologia", "Espaço", "Games", "Ao vivo", "Podcasts"];

export function VideoModule() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tudo");
  const [playing, setPlaying] = useState<Video | null>(null);

  const filtered = useMemo(
    () => VIDEOS.filter((v) => v.title.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2 space-y-3 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vídeos, canais…"
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                cat === c ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {playing && (
          <div className="rounded-2xl overflow-hidden glass border border-white/10">
            <div
              className="aspect-video flex items-center justify-center"
              style={{ background: `radial-gradient(circle at 40% 30%, oklch(0.45 0.2 ${playing.hue} / 0.7), oklch(0.12 0.04 280))` }}
            >
              <Play className="h-16 w-16 text-white/90 drop-shadow-lg" fill="currentColor" />
            </div>
            <div className="p-4">
              <h2 className="font-semibold leading-snug">{playing.title}</h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" /> {playing.views} visualizações · {playing.age}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8"><AvatarFallback>{playing.channel.charAt(0)}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium">{playing.channel}</span>
                </div>
                <Button size="sm" className="rounded-full"><BellPlus className="h-4 w-4 mr-1" />Inscrever</Button>
              </div>
            </div>
          </div>
        )}

        {filtered.map((v) => (
          <button key={v.id} onClick={() => setPlaying(v)} className="w-full text-left group">
            <div className="relative rounded-2xl overflow-hidden">
              <div
                className="aspect-video flex items-center justify-center"
                style={{ background: `radial-gradient(circle at 60% 40%, oklch(0.45 0.2 ${v.hue} / 0.6), oklch(0.12 0.04 280))` }}
              >
                <Play className="h-12 w-12 text-white/70 group-hover:scale-110 transition" fill="currentColor" />
              </div>
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium">{v.duration}</span>
            </div>
            <div className="flex gap-3 mt-2.5">
              <Avatar className="h-9 w-9 shrink-0"><AvatarFallback>{v.channel.charAt(0)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <h3 className="text-sm font-medium leading-snug line-clamp-2">{v.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{v.channel}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Eye className="h-3 w-3" />{v.views} · {v.age}
                </p>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum vídeo encontrado.</p>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}
