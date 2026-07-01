import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Wand2, Loader2, Send, Code2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatAssistant } from "@/lib/game-ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

export type Template = { label: string; emoji: string; prompt: string; code: string };

export const GAME_TEMPLATES: Template[] = [
  {
    label: "Nave x meteoros",
    emoji: "🚀",
    prompt: "Um jogo de nave que desvia de meteoros",
    code: `fundo #0b0b1e
criar nave 150 280 ciano 22
criar meteoro 150 0 vermelho 20
quando_tecla esquerda mover nave -6 0
quando_tecla direita mover nave 6 0
sempre mover meteoro 0 4
ao_tocar nave meteoro fim Sua nave foi atingida!`,
  },
  {
    label: "Pegue as moedas",
    emoji: "🪙",
    prompt: "Pegue as moedas para fazer pontos",
    code: `fundo #14233b
criar jogador 150 150 ciano 24
criar moeda 60 60 amarelo 16
quando_tecla esquerda mover jogador -6 0
quando_tecla direita mover jogador 6 0
quando_tecla cima mover jogador 0 -6
quando_tecla baixo mover jogador 0 6
ao_tocar jogador moeda pontos 1`,
  },
  {
    label: "Plataforma",
    emoji: "🟩",
    prompt: "Plataforma simples com gravidade",
    code: `fundo #1a1030
gravidade 0.4
criar heroi 150 100 verde 24
criar estrela 250 200 amarelo 16
quando_tecla espaco mover heroi 0 -8
quando_tecla esquerda mover heroi -5 0
quando_tecla direita mover heroi 5 0
ao_tocar heroi estrela pontos 1`,
  },
  {
    label: "Fuja do inimigo",
    emoji: "👾",
    prompt: "Colete itens e fuja do inimigo",
    code: `fundo #0d1b2a
criar jogador 150 280 ciano 22
criar inimigo 150 0 roxo 22
criar item 80 120 amarelo 16
quando_tecla esquerda mover jogador -6 0
quando_tecla direita mover jogador 6 0
sempre mover inimigo 0 3
ao_tocar jogador item pontos 1
ao_tocar jogador inimigo fim O inimigo te pegou!`,
  },
];

export const SUGGESTIONS = [
  "Explique o código atual linha por linha",
  "Deixe o jogo mais difícil",
  "Tem algum bug? Conserte pra mim",
  "Adicione um segundo inimigo",
  "Me dê ideias de vídeo sobre esse jogo",
  "Crie um título chamativo para um short",
];

function extractCode(text: string): string | null {
  const m = text.match(/```(?:newcatroid|text)?\s*\n([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
}

function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

type Checkpoint = { id: string; label: string; code: string; at: number };

export function GameAiChat({
  currentCode,
  onUseCode,
  sessionId = "novo",
}: {
  currentCode: string;
  onUseCode: (code: string) => void;
  sessionId?: string;
}) {
  const memKey = `catrogo:ai:${sessionId}`;
  const ckKey = `catrogo:ck:${sessionId}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(memKey) || "[]"); } catch { return []; }
  });
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(() => {
    try { return JSON.parse(localStorage.getItem(ckKey) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const callChat = useServerFn(chatAssistant);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(memKey, JSON.stringify(messages.slice(-40))); } catch { /* quota */ }
  }, [messages, memKey]);

  useEffect(() => {
    try { localStorage.setItem(ckKey, JSON.stringify(checkpoints.slice(-12))); } catch { /* quota */ }
  }, [checkpoints, ckKey]);

  const saveCheckpoint = () => {
    if (!currentCode.trim()) { toast.error("Nada para salvar ainda"); return; }
    const cp: Checkpoint = {
      id: crypto.randomUUID(),
      label: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      code: currentCode,
      at: Date.now(),
    };
    setCheckpoints((c) => [...c, cp]);
    toast.success("Ponto de verificação salvo! ⏱️");
  };

  const clearMemory = () => {
    setMessages([]);
    toast.success("Memória da conversa limpa");
  };


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await callChat({ data: { messages: next, currentCode: currentCode || undefined } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error((e as Error).message || "A IA não respondeu");
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      setBusy(false);
    }
  };

  const useTemplate = (t: Template) => {
    onUseCode(t.code);
    toast.success(`Modelo "${t.label}" carregado! Edite ou peça ajustes à IA.`);
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/10 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-primary/20">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Criar e conversar com a IA</span>
      </div>

      {/* Templates */}
      <div className="p-3 space-y-2 border-b border-primary/15">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Wand2 className="h-3 w-3" /> Modelos prontos — clique para começar na hora
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {GAME_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => useTemplate(t)}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 text-xs text-left hover:bg-white/10 transition"
            >
              <span>{t.emoji}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="max-h-[260px] overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Peça um jogo, tire dúvidas sobre o código ou peça ideias de vídeos. A IA explica e cria pra você. 💬
          </p>
        ) : (
          messages.map((m, i) => {
            const code = m.role === "assistant" ? extractCode(m.content) : null;
            const text = m.role === "assistant" ? stripCode(m.content) : m.content;
            return (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/5"
                  }`}
                >
                  {text && <p>{text}</p>}
                  {code && (
                    <div className="mt-2 space-y-1.5">
                      <pre className="rounded-lg bg-black/50 p-2 text-[11px] font-mono overflow-x-auto leading-relaxed">{code}</pre>
                      <Button size="sm" className="h-7 text-xs" onClick={() => { onUseCode(code); toast.success("Código aplicado no editor!"); }}>
                        <Code2 className="h-3 w-3 mr-1" /> Usar este código
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/5 px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando…
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={busy}
            className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/10 transition disabled:opacity-50"
          >
            <Lightbulb className="h-3 w-3" /> {s}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="p-3 pt-1 flex items-end gap-2 border-t border-primary/15">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Converse com a IA: crie, corrija bugs, peça ideias de vídeo…"
          className="min-h-[44px] max-h-28 bg-white/5 border-white/10 text-sm resize-none"
        />
        <Button size="icon" onClick={() => send(input)} disabled={busy || !input.trim()} className="shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
