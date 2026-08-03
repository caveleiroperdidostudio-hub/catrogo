import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Wand2, Loader2, Download, RefreshCw, Smartphone, Monitor, Rocket, Coins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { generateHtmlGame } from "@/lib/game-ai.functions";
import { GAME_COSTS, spendCoins } from "@/lib/economy";
import { useWallet } from "@/lib/wallet-context";
import { useAuth } from "@/lib/auth-context";
import { saveGame } from "@/lib/ugc";

const IDEAS = [
  "Jogo de plataforma 2D com pulo duplo e moedas",
  "Corrida infinita estilo endless runner",
  "Quebra-cabeça de encaixar peças coloridas",
  "Nave espacial atirando em asteroides",
];

export function HtmlGameStudio({
  onClose,
  initialHtml,
  onPublished,
}: {
  onClose: () => void;
  initialHtml?: string;
  onPublished?: () => void;
}) {
  const gen = useServerFn(generateHtmlGame);
  const { user } = useAuth();
  const { setBalance } = useWallet();
  const [prompt, setPrompt] = useState("");
  const [html, setHtml] = useState<string | null>(initialHtml ?? null);
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<"export" | "publish" | null>(null);
  const [device, setDevice] = useState<"phone" | "desktop">("desktop");
  const [title, setTitle] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generate = async (p: string) => {
    const text = p.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const r = await gen({ data: { prompt: text } });
      setHtml(r.html);
      if (!title.trim()) setTitle(text.slice(0, 60));
      toast.success("Jogo gerado em HTML!");
    } catch (e) {
      toast.error((e as Error).message ?? "Falha ao gerar o jogo");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!html || working) return;
    setWorking("export");
    try {
      const bal = await spendCoins(GAME_COSTS.export, "export_game", title.trim() || "jogo html");
      setBalance(bal);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title.trim() || "jogo-catrogo").replace(/[^\w-]+/g, "-").toLowerCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Jogo exportado! -${GAME_COSTS.export} hypes`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível exportar");
    } finally {
      setWorking(null);
    }
  };

  const publish = async () => {
    if (!html || !user || working) return;
    if (!title.trim()) return toast.error("Dê um título ao jogo antes de publicar");
    setWorking("publish");
    try {
      const bal = await spendCoins(GAME_COSTS.publish, "publish_game", title.trim());
      setBalance(bal);
      await saveGame({
        userId: user.id,
        title: title.trim(),
        description: "Jogo em HTML criado com a IA do CatroGo",
        sourceCode: html,
        engine: "html",
        published: true,
        price: 0,
      });
      toast.success(`Publicado no CatroGo! -${GAME_COSTS.publish} hypes`);
      onPublished?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível publicar");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex flex-col bg-zinc-950">
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-white/10">
        <Wand2 className="h-5 w-5 text-primary" />
        <span className="font-semibold flex-1 truncate">IA de Jogos do CatroGo</span>
        {html && (
          <div className="flex rounded-lg border border-white/10 overflow-hidden mr-1">
            <button
              onClick={() => setDevice("phone")}
              className={`p-1.5 ${device === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              title="Mobile"
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice("desktop")}
              className={`p-1.5 ${device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              title="PC"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-white ml-1" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {html ? (
          <div className="h-full flex items-center justify-center bg-black/60 p-2">
            <iframe
              ref={iframeRef}
              title="preview"
              srcDoc={html}
              className={`bg-white rounded-xl border border-white/10 ${device === "phone" ? "w-[380px] max-w-full h-full" : "w-full h-full"}`}
              sandbox="allow-scripts allow-pointer-lock"
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 flex flex-col items-center justify-center text-center gap-4">
            <Wand2 className="h-12 w-12 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Crie um jogo completo com IA</h2>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                A mesma IA cria os jogos dentro do CatroGo. Publicar na vitrine custa {GAME_COSTS.publish} hypes e
                exportar o arquivo custa {GAME_COSTS.export} hypes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {IDEAS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setPrompt(s); generate(s); }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-left hover:bg-white/10 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        {html && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do jogo"
              className="h-9 flex-1 min-w-[160px] bg-white/5 border-white/10"
            />
            <Button size="sm" variant="secondary" className="h-9" onClick={download} disabled={!!working}>
              {working === "export" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Exportar <Coins className="h-3 w-3 mx-1 text-amber-400" />{GAME_COSTS.export}
            </Button>
            <Button size="sm" className="h-9" onClick={publish} disabled={!!working}>
              {working === "publish" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
              Publicar <Coins className="h-3 w-3 mx-1 text-amber-400" />{GAME_COSTS.publish}
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                generate(prompt);
              }
            }}
            placeholder="Descreva o jogo que você quer criar…"
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 resize-none bg-white/5 border-white/10"
          />
          <Button className="h-11 shrink-0" onClick={() => generate(prompt)} disabled={busy || !prompt.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : html ? <RefreshCw className="h-4 w-4 mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            {html ? "Refazer" : "Gerar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
