import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Gamepad2, Play, Loader2, Coins, Lock, Wand2, Upload, EyeOff, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@/lib/wallet-context";
import { buyGame, listOwnedGameIds, GAME_COSTS, spendCoins } from "@/lib/economy";
import { GameCanvas } from "./GameCanvas";
import { HtmlGameStudio } from "./HtmlGameStudio";
import { CardListSkeleton } from "@/components/ui/list-skeleton";
import { listGames, saveGame, deleteGame, registerPlay, getGameSource, type GameProject } from "@/lib/ugc";

type View = "list" | "play";

const isHtmlSource = (src: string) => /<html|<!doctype html|<canvas|<script/i.test(src);

export function GamesModule() {
  const { user } = useAuth();
  const { setBalance } = useWallet();
  const [view, setView] = useState<View>("list");
  const [studio, setStudio] = useState<null | { existing?: { game: GameProject; source: string } }>(null);
  const [games, setGames] = useState<GameProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [playing, setPlaying] = useState<GameProject | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [gs, own] = await Promise.all([
        listGames(),
        user ? listOwnedGameIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      setGames(gs);
      setOwned(own);
    } catch {
      toast.error("Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openEdit = async (g: GameProject) => {
    try {
      const source = g.source_code || (await getGameSource(g.id));
      setStudio({ existing: { game: g, source } });
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível abrir o jogo");
    }
  };

  const handleBuy = async (g: GameProject) => {
    if (!user) return;
    setBuyingId(g.id);
    try {
      const bal = await buyGame(g.id);
      setBalance(bal);
      setOwned((s) => new Set(s).add(g.id));
      toast.success(`"${g.title}" comprado! 🎮`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível comprar");
    } finally {
      setBuyingId(null);
    }
  };

  const canPlay = (g: GameProject) => g.price === 0 || g.user_id === user?.id || owned.has(g.id);

  const handleImportFile = async (file: File | null) => {
    if (!file || !user || importing) return;
    setImporting(true);
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error("Arquivo vazio");
      if (!isHtmlSource(text)) throw new Error("Envie um jogo em HTML (.html)");
      const bal = await spendCoins(GAME_COSTS.import, "import_game", file.name);
      setBalance(bal);
      const imported = await saveGame({
        userId: user.id,
        title: file.name.replace(/\.html?$/i, "").slice(0, 60) || "Jogo importado",
        description: "Jogo importado para o CatroGo",
        sourceCode: text,
        engine: "html",
        published: false,
        price: 0,
      });
      toast.success(`Jogo importado! -${GAME_COSTS.import} hypes. Publique para aparecer na vitrine.`);
      await load();
      setStudio({ existing: { game: imported, source: text } });
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível importar");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const handleDelete = async (g: GameProject) => {
    try {
      await deleteGame(g.id);
      toast.success("Jogo removido");
      load();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const openPlay = async (g: GameProject) => {
    try {
      const src = g.source_code || (await getGameSource(g.id));
      setPlaying({ ...g, source_code: src });
      setView("play");
      registerPlay(g.id);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível abrir o jogo");
    }
  };

  const studioNode = studio && (
    <HtmlGameStudio
      existing={studio.existing}
      onClose={() => setStudio(null)}
      onSaved={load}
      onPublished={load}
    />
  );

  /* ---------- PLAY ---------- */
  if (view === "play" && playing) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {studioNode}
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium truncate">{playing.title}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
          {playing.engine === "html" ? (
            <iframe
              title={playing.title}
              srcDoc={playing.source_code}
              className="w-full h-[70vh] rounded-xl bg-white border border-white/10"
              sandbox="allow-scripts allow-pointer-lock"
            />
          ) : (
            <GameCanvas code={playing.source_code} />
          )}
          {playing.description && <p className="text-sm text-muted-foreground text-center max-w-sm">{playing.description}</p>}
          <p className="text-xs text-muted-foreground">por @{playing.author?.username ?? "criador"} · {playing.plays} partidas</p>
          {playing.user_id === user?.id && (
            <Button variant="secondary" onClick={() => openEdit(playing)}>
              <Wand2 className="h-4 w-4 mr-1" /> Ajustar com a IA
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- LIST ---------- */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {studioNode}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/5">
        <Gamepad2 className="h-5 w-5 text-[var(--nebula)]" />
        <span className="font-semibold flex-1 truncate">Catrogo Games</span>
        <input
          ref={importRef}
          type="file"
          accept=".html,.htm"
          className="hidden"
          onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
        />
        <Button size="sm" variant="ghost" onClick={() => importRef.current?.click()} disabled={importing} title={`Importar jogo (${GAME_COSTS.import} hypes)`}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          <span className="hidden sm:inline">Importar</span>
          <Coins className="h-3 w-3 mx-0.5 text-amber-400" />{GAME_COSTS.import}
        </Button>
        <Button size="sm" onClick={() => setStudio({})}>
          <Wand2 className="h-4 w-4 mr-1" /> Criar com IA
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : games.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum jogo ainda. Descreva sua ideia e a IA programa o jogo inteiro em HTML — sem escrever uma linha de código.
            </p>
            <Button onClick={() => setStudio({})}><Wand2 className="h-4 w-4 mr-1" /> Criar com IA</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {games.map((g) => {
              const locked = !canPlay(g);
              return (
                <div key={g.id} className="rounded-2xl overflow-hidden glass border border-white/10 flex flex-col">
                  <button
                    onClick={() => (locked ? handleBuy(g) : openPlay(g))}
                    className="relative aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-[var(--cosmic)]/30 to-[var(--nebula)]/30"
                  >
                    {locked ? <Lock className="h-8 w-8 text-white/80" /> : <Play className="h-9 w-9 text-white/80" fill="currentColor" />}
                    {!g.published && (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-amber-500/80 px-2 py-0.5 text-[9px] font-semibold text-black">
                        rascunho
                      </span>
                    )}
                  </button>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold truncate">{g.title}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar className="h-4 w-4"><AvatarFallback className="text-[8px]">{(g.author?.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      <span className="truncate">@{g.author?.username ?? "criador"}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">{g.plays} partidas</p>
                      {g.price > 0 ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400"><Coins className="h-3 w-3" />{g.price}</span>
                      ) : (
                        <span className="text-[11px] text-emerald-400">Grátis</span>
                      )}
                    </div>
                    {locked && (
                      <Button size="sm" className="mt-2 h-7 text-xs" disabled={buyingId === g.id} onClick={() => handleBuy(g)}>
                        {buyingId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Comprar <Coins className="h-3 w-3 ml-1" />{g.price}</>}
                      </Button>
                    )}
                    {g.user_id === user?.id && (
                      <div className="mt-2 flex items-center gap-3">
                        <button onClick={() => openEdit(g)} className="text-[11px] text-primary flex items-center gap-1">
                          <Pencil className="h-3 w-3" /> ajustar com IA
                        </button>
                        <button onClick={() => handleDelete(g)} className="text-[11px] text-red-400 flex items-center gap-1">
                          <Trash2 className="h-3 w-3" /> excluir
                        </button>
                      </div>
                    )}
                    {!g.published && g.user_id === user?.id && (
                      <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> só você vê
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
