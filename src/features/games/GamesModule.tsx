import { useEffect, useState } from "react";
import { ArrowLeft, Gamepad2, Plus, Play, Save, Trash2, Loader2, BookOpen, Coins, Lock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@/lib/wallet-context";
import { buyGame, listOwnedGameIds } from "@/lib/economy";
import { GameCanvas } from "./GameCanvas";
import { GameAiChat } from "./GameAiChat";
import { NEWCATROID_EXAMPLE } from "@/lib/newcatroid";
import {
  listGames,
  saveGame,
  deleteGame,
  registerPlay,
  type GameProject,
} from "@/lib/ugc";

type View = "list" | "editor" | "play" | "docs";

const DOCS = `# Comandos da linguagem Newcatroid

CONFIGURAÇÃO
  fundo <cor>                      cor do cenário
  gravidade <valor>                ex: gravidade 0.4
  criar <nome> <x> <y> <cor> <tam> cria um objeto quadrado

CONTROLES E LAÇOS
  quando_tecla <tecla> mover <nome> <dx> <dy>
      teclas: esquerda, direita, cima, baixo, espaco
  sempre mover <nome> <dx> <dy>    roda a cada quadro
  ao_tocar <a> <b> fim <mensagem>  encerra ao colidir
  ao_tocar <a> <b> pontos <n>      soma pontos e reposiciona <b>

CORES: hex (#ff0) ou nomes (vermelho, verde, azul, amarelo,
roxo, rosa, branco, preto, laranja, ciano)`;

export function GamesModule() {
  const { user } = useAuth();
  const { setBalance } = useWallet();
  const [view, setView] = useState<View>("list");
  const [games, setGames] = useState<GameProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const [editing, setEditing] = useState<GameProject | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(0);
  const [code, setCode] = useState(NEWCATROID_EXAMPLE);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<GameProject | null>(null);
  const [previewCode, setPreviewCode] = useState(NEWCATROID_EXAMPLE);

  const applyCode = (c: string) => {
    setCode(c);
    setPreviewCode(c);
  };




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

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setDesc("");
    setPrice(0);
    setCode(NEWCATROID_EXAMPLE);
    setPreviewCode(NEWCATROID_EXAMPLE);
    setView("editor");
  };

  const openEdit = (g: GameProject) => {
    setEditing(g);
    setTitle(g.title);
    setDesc(g.description ?? "");
    setPrice(g.price ?? 0);
    setCode(g.source_code);
    setPreviewCode(g.source_code);
    setView("editor");
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


  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) return toast.error("Dê um título ao jogo");
    setSaving(true);
    try {
      await saveGame({
        id: editing?.id,
        userId: user.id,
        title: title.trim(),
        description: desc.trim(),
        sourceCode: code,
        price,
      });
      toast.success("Jogo salvo!");
      await load();
      setView("list");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
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

  const openPlay = (g: GameProject) => {
    setPlaying(g);
    setView("play");
    registerPlay(g.id);
  };

  /* ---------- EDITOR ---------- */
  if (view === "editor") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium flex-1">{editing ? "Editar jogo" : "Novo jogo"}</span>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Input placeholder="Título do jogo" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
            <Coins className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm text-muted-foreground">Preço (0 = grátis)</span>
            <Input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="ml-auto w-24 h-8 bg-black/30 border-white/10 text-right"
            />
          </div>
          <Input placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-white/5 border-white/10" />

          {/* Assistente de IA conversacional */}
          <GameAiChat currentCode={code} onUseCode={applyCode} sessionId={editing?.id ?? "novo"} />


          <div className="flex justify-center">
            <GameCanvas code={previewCode} width={280} height={280} key={previewCode} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Código do jogo (você pode editar)</p>
              <button onClick={() => setView("docs")} className="text-[11px] text-primary flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Ver comandos
              </button>
            </div>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="font-mono text-xs min-h-[220px] bg-black/40 border-white/10 leading-relaxed"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPreviewCode(code)}>
              <Play className="h-4 w-4 mr-1" /> Testar código
            </Button>
            <Button variant="ghost" onClick={() => setView("docs")}>
              <BookOpen className="h-4 w-4 mr-1" /> Comandos
            </Button>
          </div>
        </div>

      </div>
    );
  }

  /* ---------- DOCS ---------- */
  if (view === "docs") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setView("editor")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">Linguagem Newcatroid</span>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground">{DOCS}</pre>
      </div>
    );
  }

  /* ---------- PLAY ---------- */
  if (view === "play" && playing) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{playing.title}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
          <GameCanvas code={playing.source_code} />
          {playing.description && <p className="text-sm text-muted-foreground text-center max-w-sm">{playing.description}</p>}
          <p className="text-xs text-muted-foreground">por @{playing.author?.username ?? "criador"} · {playing.plays} partidas</p>
          {playing.user_id === user?.id && (
            <Button variant="secondary" onClick={() => openEdit(playing)}>Editar este jogo</Button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- LIST ---------- */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/5">
        <Gamepad2 className="h-5 w-5 text-[var(--nebula)]" />
        <span className="font-semibold flex-1">Catrogo Game Engine</span>
        <Button size="sm" variant="secondary" onClick={() => setHtmlStudio(true)}>
          <Wand2 className="h-4 w-4 mr-1" /> IA HTML
        </Button>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Criar
        </Button>
      </div>
      {htmlStudio && <HtmlGameStudio onClose={() => setHtmlStudio(false)} />}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum jogo ainda. Crie o primeiro com a linguagem Newcatroid!</p>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar jogo</Button>
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
                      <button onClick={() => handleDelete(g)} className="mt-2 text-[11px] text-red-400 flex items-center gap-1 self-start">
                        <Trash2 className="h-3 w-3" /> excluir
                      </button>
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
