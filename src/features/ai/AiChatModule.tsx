import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { platformAssistant } from "@/lib/game-ai.functions";
import { aiNavigate } from "@/lib/ai-nav.functions";
import { useAppNav, pageLabel } from "@/lib/app-nav";
import { useCtrgUi, uiLabel } from "@/lib/ctrg-ui";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Como eu ganho CatCoins?",
  "Me dê 5 ideias de shorts virais",
  "Crie um conceito de jogo mobile",
  "Como faço uma chamada de vídeo?",
  "Quero ver os filmes",
  "Abra minhas configurações",
  "Qual Ctrg UI estou usando?",
];

const STORAGE_KEY = "catrogo-ai-chat";

export function AiChatModule() {
  const chat = useServerFn(platformAssistant);
  const navigate = useServerFn(aiNavigate);
  const { go } = useAppNav();
  const { info } = useCtrgUi();
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);

    // Verifica se o usuário pediu para abrir uma tela (IA com navegação)
    let navHandled = false;
    try {
      const nav = await navigate({ data: { message: content } });
      if (nav.page) {
        const label = pageLabel(nav.page);
        const navigated = go(nav.page);
        if (navigated) {
          navHandled = true;
          const sayText = nav.say ?? `Abrindo ${label}…`;
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: `🔗 ${sayText}\n\nVocê foi levado para **${label}**.`,
          }]);
        }
      }
    } catch {
      /* navegação opcional — não interrompe o chat */
    }

    if (navHandled) {
      setBusy(false);
      setTimeout(() => taRef.current?.focus(), 50);
      return;
    }

    // Resposta especial: "Qual Ctrg UI estou usando?"
    if (/ctrg\s*ui|interface/i.test(content) && /usando|versão|qual/i.test(content)) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Você está usando **${uiLabel(info)}**.\n\n- Versão do app: ${info.app_version}\n- Interface: ${info.kind === "pro" ? "Ctrg UI Pro" : "Ctrg UI"} ${info.ui_version}\n- Modo: ${info.ui_mode}`,
      }]);
      setBusy(false);
      setTimeout(() => taRef.current?.focus(), 50);
      return;
    }

    try {
      const r = await chat({ data: { messages: next.slice(-20) } });
      setMessages((prev) => [...prev, { role: "assistant", content: r.reply || "…" }]);
    } catch (e) {
      toast.error((e as Error).message ?? "Falha ao falar com a IA");
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Não consegui responder agora. Tente novamente." }]);
    } finally {
      setBusy(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const clear = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-14 shrink-0 px-4 flex items-center gap-2 border-b border-white/5">
        <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center cosmic-glow">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight bg-gradient-to-r from-[var(--cosmic)] to-[var(--nebula)] bg-clip-text text-transparent">
            Catrogo IA
          </div>
          <div className="text-[11px] text-muted-foreground">Assistente inteligente da plataforma</div>
        </div>
        {messages.length > 0 && (
          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={clear} title="Limpar conversa">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-10 gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center carlos-avatar">
              <Sparkles className="h-9 w-9 text-[var(--nebula)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Fale com a Catrogo IA</h2>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                Tire dúvidas, peça ideias, crie jogos e peça para abrir telas do app.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-left hover:bg-white/10 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[90%] text-sm leading-relaxed prose prose-invert prose-sm prose-pre:bg-black/50 prose-pre:rounded-xl prose-code:text-[var(--nebula)] max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Catrogo IA está pensando…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Pergunte qualquer coisa à Catrogo IA…"
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 resize-none bg-white/5 border-white/10"
          />
          <Button size="icon" className="h-11 w-11 shrink-0" onClick={() => send(input)} disabled={busy || !input.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
