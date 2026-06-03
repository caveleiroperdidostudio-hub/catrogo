import { useState } from "react";
import { ArrowLeft, Trophy, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactionGame } from "./ReactionGame";

type Game = {
  id: string;
  name: string;
  desc: string;
  hue: number;
  playable?: boolean;
};

const GAMES: Game[] = [
  { id: "reaction", name: "Reflexo Cósmico", desc: "Toque o mais rápido possível", hue: 295, playable: true },
  { id: "memory", name: "Memória Estelar", desc: "Combine as estrelas", hue: 215, playable: false },
  { id: "snake", name: "Cobra Galáctica", desc: "Clássico arcade", hue: 140, playable: false },
  { id: "2048", name: "Órbitas 2048", desc: "Junte os planetas", hue: 35, playable: false },
];

const LEADERBOARD = [
  { name: "nova", score: 182 },
  { name: "astro", score: 201 },
  { name: "luna", score: 233 },
];

export function GamesModule() {
  const [active, setActive] = useState<Game | null>(null);

  if (active?.id === "reaction") {
    return (
      <div className="flex h-full flex-col">
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setActive(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <span className="font-medium">{active.name}</span>
        </div>
        <ReactionGame />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/5">
        <Gamepad2 className="h-5 w-5 text-[var(--nebula)]" />
        <span className="font-semibold">Hub de Jogos</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => g.playable && setActive(g)}
              className="relative rounded-2xl overflow-hidden glass border border-white/10 text-left disabled:opacity-60"
              disabled={!g.playable}
            >
              <div
                className="aspect-[4/3] flex items-center justify-center"
                style={{ background: `radial-gradient(circle at 50% 40%, oklch(0.5 0.2 ${g.hue} / 0.7), oklch(0.12 0.04 280))` }}
              >
                <Gamepad2 className="h-10 w-10 text-white/80" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold">{g.name}</h3>
                <p className="text-xs text-muted-foreground">{g.playable ? g.desc : "Em breve"}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl glass border border-white/10 p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-yellow-400" /> Placar mundial
          </h3>
          <ol className="space-y-2">
            {LEADERBOARD.map((p, i) => (
              <li key={p.name} className="flex items-center gap-3 text-sm">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400/20 text-yellow-400" : "bg-white/5 text-muted-foreground"}`}>{i + 1}</span>
                <span className="flex-1">@{p.name}</span>
                <span className="font-mono text-muted-foreground">{p.score} ms</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
