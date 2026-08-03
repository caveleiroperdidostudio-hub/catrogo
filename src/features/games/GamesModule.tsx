import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Gamepad2, Plus, Play, Save, Trash2, Loader2, BookOpen, Coins, Lock, Wand2, Download, Rocket, Upload, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@/lib/wallet-context";
import { buyGame, listOwnedGameIds, GAME_COSTS, spendCoins } from "@/lib/economy";
import { GameCanvas } from "./GameCanvas";
import { GameAiChat } from "./GameAiChat";
import { HtmlGameStudio } from "./HtmlGameStudio";
import { NEWCATROID_EXAMPLE } from "@/lib/newcatroid";
import {
  listGames,
  saveGame,
  deleteGame,
  publishGame,
  registerPlay,
  getGameSource,
  type GameProject,
  type GameEngine,
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

const isHtmlSource = (src: string) => /<html|<!doctype html|<canvas|<script/i.test(src);

export function GamesModule() {
  const { user } = useAuth();
  const { setBalance } = useWallet();
  const [view, setView] = useState<View>("list");
  const [htmlStudio, setHtmlStudio] = useState(false);
  const [games, setGames] = useState<GameProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [editing, setEditing] = useState<GameProject | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(0);
  const [code, setCode] = useState(NEWCATROID_EXAMPLE);
  const [engine, setEngine] = useState<GameEngine>("newcatroid");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<"export" | "publish" | null>(null);
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
    setEngine("newcatroid");
    setPublished(false);
    setCode(NEWCATROID_EXAMPLE);
    setPreviewCode(NEWCATROID_EXAMPLE);
    setView("editor");
  };

  const openEdit = async (g: GameProject) => {
    setEditing(g);
    setTitle(g.title);
    setDesc(g.description ?? "");
    setPrice(g.price ?? 0);
    setEngine(g.engine ?? "newcatroid");
    setPublished(!!g.published);
    try {
      const src = g.source_code || (await getGameSource(g.id));
      setCode(src);
      setPreviewCode(src);
    } catch (e) {
      return toast.error((e as Error).message || "Não foi possível abrir o código");
    }
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

  const persist = async (opts?: { publish?: boolean }) => {
    if (!user) return null;
    return saveGame({
      id: editing?.id,
      userId: user.id,
      title: title.trim(),
      description: desc.trim(),
      sourceCode: code,
      price,
      engine,
      ...(opts?.publish ? { published: true } : editing ? {} : { published: false }),
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) return toast.error("Dê um título ao jogo");
    setSaving(true);
    try {
      const saved = await persist();
      if (saved) setEditing(saved);
      toast.success(published ? "Jogo salvo!" : "Rascunho salvo (visível só para você)");
      await load();
      setView("list");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user || working) return;
    if (!title.trim()) return toast.error("Dê um título ao jogo");
    setWorking("publish");
    try {
      const bal = await spendCoins(GAME_COSTS.publish, "publish_game", title.trim());
      setBalance(bal);
      const saved = await persist({ publish: true });
      if (saved?.id) await publishGame(saved.id);
      if (saved) setEditing(saved);
      setPublished(true);
      toast.success(`Publicado no CatroGo! -${GAME_COSTS.publish} hypes`);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível publicar");
    } finally {
      setWorking(null);
    }
  };

  const handleExport = async () => {
    if (working) return;
    if (!code.trim()) return toast.error("Nada para exportar");
    setWorking("export");
    try {
      const bal = await spendCoins(GAME_COSTS.export, "export_game", title.trim() || "jogo");
      setBalance(bal);
      const ext = engine === "html" ? "html" : "newcatroid.txt";
      const blob = new Blob([code], { type: engine === "html" ? "text/html" : "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title.trim() || "jogo-catrogo").replace(/[^\w-]+/g, "-").toLowerCase()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Jogo exportado! -${GAME_COSTS.export} hypes`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível exportar");
    } finally {
      setWorking(null);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file || !user || importing) return;
    setImporting(true);
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error("Arquivo vazio");
      const bal = await spendCoins(GAME_COSTS.import, "import_game", file.name);
      setBalance(bal);
      const detected: GameEngine = isHtmlSource(text) ? "html" : "newcatroid";
      const imported = await saveGame({
        userId: user.id,
        title: file.name.replace(/\.(html?|txt)$/i, "").slice(0, 60) || "Jogo importado",
        description: "Jogo importado para o CatroGo",
        sourceCode: text,
        engine: detected,
        published: false,
        price: 0,
      });
      toast.success(`Jogo importado! -${GAME_COSTS.import} hypes. Publique para aparecer na vitrine.`);
      await load();
      openEdit(imported);
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

  /* ---------- EDITOR ---------- */
  if (view === "editor") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium flex-1 truncate">{editing ? "Editar jogo" : "Novo jogo"}</span>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </div>
        {htmlStudio && (
          <HtmlGameStudio
            initialHtml={engine === "html" ? code : undefined}
            onClose={() => setHtmlStudio(false)}
            onPublished={() => { load(); setView("list"); }}
          />
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Input placeholder="Título do jogo" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" />

          {/* Motor do jogo */}
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-1">
            {(["newcatroid", "html"] as GameEngine[]).map((e) => (
              <button
                key={e}
                onClick={() => setEngine(e)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${engine === e ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {e === "newcatroid" ? "Newcatroid" : "HTML (IA)"}
              </button>
            ))}
          </div>

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

          {/* Assistente de IA */}
          {engine === "newcatroid" ? (
            <GameAiChat currentCode={code} onUseCode={applyCode} sessionId={editing?.id ?? "novo"} />
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setHtmlStudio(true)}>
              <Wand2 className="h-4 w-4 mr-1" /> Criar/ajustar com a IA de jogos
            </Button>
          )}

          <div className="flex justify-center">
            {engine === "html" ? (
              <iframe
                title="preview"
                srcDoc={previewCode}
                className="w-full h-[320px] rounded-xl bg-white border border-white/10"
                sandbox="allow-scripts allow-pointer-lock"
              />
            ) : (
              <GameCanvas code={previewCode} width={280} height={280} key={previewCode} />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {engine === "html" ? "Código HTML do jogo" : "Código do jogo (você pode editar)"}
              </p>
              {engine === "newcatroid" && (
                <button onClick={() => setView("docs")} className="text-[11px] text-primary flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Ver comandos
                </button>
              )}
            </div>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="font-mono text-xs min-h-[220px] bg-black/40 border-white/10 leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="flex-1 min-w-[140px]" onClick={() => setPreviewCode(code)}>
              <Play className="h-4 w-4 mr-1" /> Testar
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!!working}>
              {working === "export" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Exportar <Coins className="h-3 w-3 mx-1 text-amber-400" />{GAME_COSTS.export}
            </Button>
            {!published && (
              <Button onClick={handlePublish} disabled={!!working}>
                {working === "publish" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
                Publicar <Coins className="h-3 w-3 mx-1 text-amber-400" />{GAME_COSTS.publish}
              </Button>
            )}
          </div>
          {!published && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> Rascunho: só você vê este jogo até publicar na vitrine do CatroGo.
            </p>
          )}
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
        <span className="font-semibold flex-1 truncate">Catrogo Game Engine</span>
        <input
          ref={importRef}
          type="file"
          accept=".html,.htm,.txt"
          className="hidden"
          onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
        />
        <Button size="sm" variant="ghost" onClick={() => importRef.current?.click()} disabled={importing} title={`Importar jogo (${GAME_COSTS.import} hypes)`}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          <span className="hidden sm:inline">Importar</span>
          <Coins className="h-3 w-3 mx-0.5 text-amber-400" />{GAME_COSTS.import}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setHtmlStudio(true)}>
          <Wand2 className="h-4 w-4 mr-1" /> IA
        </Button>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Criar
        </Button>
      </div>
      {htmlStudio && <HtmlGameStudio onClose={() => setHtmlStudio(false)} onPublished={load} />}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum jogo ainda. Crie com a IA, use a linguagem Newcatroid ou importe um jogo.</p>
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
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80">
                      {g.engine === "html" ? "HTML" : "Newcatroid"}
                    </span>
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
                        <button onClick={() => openEdit(g)} className="text-[11px] text-primary">editar</button>
                        <button onClick={() => handleDelete(g)} className="text-[11px] text-red-400 flex items-center gap-1">
                          <Trash2 className="h-3 w-3" /> excluir
                        </button>
                      </div>
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
