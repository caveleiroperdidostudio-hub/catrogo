import { useEffect, useMemo, useRef, useState } from "react";
import { X, TerminalSquare, Sparkles, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useGlobalEvent, startEvent, stopEvent, adminGiveHype, formatCountdown } from "@/lib/events-context";

type Line = { id: number; kind: "in" | "out" | "err" | "sys"; text: string };

type GenCommand = { name: string; usage: string; desc: string };

/* Pool the "IA" draws from to invent new admin commands over time */
const AI_POOL: GenCommand[] = [
  { name: "/broadcast", usage: "/broadcast <mensagem>", desc: "Envia um aviso global para todos os usuários online." },
  { name: "/mute", usage: "/mute <usuario> <minutos>", desc: "Silencia temporariamente um usuário no chat." },
  { name: "/ban", usage: "/ban <usuario>", desc: "Bane um usuário do app." },
  { name: "/unban", usage: "/unban <usuario>", desc: "Remove o banimento de um usuário." },
  { name: "/promo", usage: "/promo <item> <desconto%>", desc: "Cria uma promoção relâmpago na loja." },
  { name: "/reset-loja", usage: "/reset-loja", desc: "Renova imediatamente os itens da loja." },
  { name: "/destaque", usage: "/destaque <video_id>", desc: "Fixa um vídeo em destaque na página inicial." },
  { name: "/moeda", usage: "/moeda x<multiplicador>", desc: "Ativa evento de CatCoins em dobro por tempo limitado." },
  { name: "/sorteio", usage: "/sorteio <premio>", desc: "Inicia um sorteio entre usuários ativos." },
  { name: "/manutencao", usage: "/manutencao on|off", desc: "Ativa ou desativa o modo de manutenção." },
  { name: "/limpar-cache", usage: "/limpar-cache", desc: "Limpa caches temporários do servidor." },
  { name: "/status", usage: "/status", desc: "Mostra métricas em tempo real do app." },
  { name: "/xp", usage: "/xp <usuario> <quantidade>", desc: "Concede pontos de experiência a um usuário." },
  { name: "/tema", usage: "/tema <nome>", desc: "Aplica um tema visual global temporário." },
  { name: "/nivel", usage: "/nivel <usuario> <nivel>", desc: "Define o nível de um usuário." },
];

const STATIC_HELP: GenCommand[] = [
  { name: "/evento", usage: "/evento <nome> <todos|id>", desc: "Dispara um evento global (ex: /evento Natal todos)." },
  { name: "/give hype to", usage: "/give hype to <conta> <qtd>", desc: "Adiciona hype (CatCoins) ao saldo de um usuário." },
  { name: "/encerrar", usage: "/encerrar", desc: "Encerra o evento global ativo agora." },
  { name: "/help", usage: "/help", desc: "Lista todos os comandos disponíveis." },
  { name: "/ia", usage: "/ia", desc: "Lista os comandos gerados pela IA em tempo real." },
  { name: "/limpar", usage: "/limpar", desc: "Limpa o terminal." },
];

export function AdminCommandConsole({ onClose }: { onClose: () => void }) {
  const { isOwner } = useAuth();
  const { event, remainingMs, refresh } = useGlobalEvent();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [aiCommands, setAiCommands] = useState<GenCommand[]>([]);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (kind: Line["kind"], text: string) =>
    setLines((prev) => [...prev, { id: ++idRef.current, kind, text }]);

  // boot banner
  useEffect(() => {
    push("sys", "╔══════════════════════════════════════╗");
    push("sys", "  CATROGO • PAINEL DE COMANDOS (DONO)");
    push("sys", "╚══════════════════════════════════════╝");
    push("out", 'Digite "/help" para ver todos os comandos.');
    push("out", "A IA cria um novo comando útil a cada 1 minuto. Use /ia para acompanhar.");
    setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI generates a new command every minute
  useEffect(() => {
    const gen = () => {
      setAiCommands((prev) => {
        const available = AI_POOL.filter((c) => !prev.some((p) => p.name === c.name));
        if (available.length === 0) return prev;
        const pick = available[Math.floor(Math.random() * available.length)];
        push("sys", `🤖 IA gerou um novo comando: ${pick.usage} — ${pick.desc}`);
        return [...prev, pick];
      });
    };
    // first one shortly after opening, then every 60s
    const first = setTimeout(gen, 4000);
    const interval = setInterval(gen, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const allCommands = useMemo(() => [...STATIC_HELP, ...aiCommands], [aiCommands]);

  const run = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    push("in", `> ${cmd}`);
    const lower = cmd.toLowerCase();

    if (lower === "/limpar" || lower === "/clear") {
      setLines([]);
      return;
    }

    if (lower === "/help") {
      push("out", "Comandos disponíveis:");
      allCommands.forEach((c) => push("out", `  ${c.usage.padEnd(28)} ${c.desc}`));
      return;
    }

    if (lower === "/ia") {
      if (aiCommands.length === 0) {
        push("out", "Nenhum comando gerado pela IA ainda. Aguarde (novo a cada minuto).");
      } else {
        push("out", `Comandos gerados pela IA (${aiCommands.length}):`);
        aiCommands.forEach((c) => push("out", `  ${c.usage.padEnd(28)} ${c.desc}`));
      }
      return;
    }

    if (lower === "/encerrar") {
      if (!event) return push("err", "Nenhum evento ativo.");
      setBusy(true);
      try {
        await stopEvent(event.id);
        await refresh();
        push("out", "✅ Evento encerrado para todos.");
      } catch (e) {
        push("err", (e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    // /evento <nome> <todos|id> [duração_horas]
    if (lower.startsWith("/evento")) {
      const parts = cmd.split(/\s+/).slice(1);
      if (parts.length < 2)
        return push("err", "Uso: /evento <nome> <todos|id> (ex: /evento Natal todos)");
      const hoursTok = parts[parts.length - 1];
      const hasHours = /^\d+$/.test(hoursTok) && parts.length >= 3;
      const scope = hasHours ? parts[parts.length - 2] : parts[parts.length - 1];
      const nameTokens = parts.slice(0, hasHours ? parts.length - 2 : parts.length - 1);
      const name = nameTokens.join(" ") || "Evento";
      const hours = hasHours ? parseInt(hoursTok, 10) : 24;
      const kind = /natal|christmas|natalino/i.test(name) ? "christmas" : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      setBusy(true);
      try {
        await startEvent(kind, name, hours * 3600);
        await refresh();
        push("out", `✅ Evento "${name}" iniciado para ${scope} por ${hours}h.`);
        if (kind === "christmas") push("out", "🎄 Tema natalino e aba de missões ativados globalmente.");
      } catch (e) {
        push("err", (e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    // /give hype to <conta> <qtd>
    if (lower.startsWith("/give")) {
      const m = cmd.match(/^\/give\s+hype\s+to\s+(.+?)\s+(\d+)\s*$/i);
      if (!m) return push("err", "Uso: /give hype to <conta> <quantidade> (ex: /give hype to Joao123 5000)");
      const target = m[1].trim();
      const qty = parseInt(m[2], 10);
      setBusy(true);
      try {
        const res = await adminGiveHype(target, qty);
        push("out", `✅ ${qty} de hype enviados para @${res.username}. Novo saldo: ${res.balance} CatCoins.`);
      } catch (e) {
        push("err", (e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    // AI-generated commands: simulated execution
    const aiMatch = aiCommands.find((c) => lower.startsWith(c.name));
    if (aiMatch) {
      push("out", `⚙️ Executando ${aiMatch.name}… (${aiMatch.desc})`);
      push("out", "✅ Comando simulado executado com sucesso.");
      return;
    }

    push("err", `Comando desconhecido: ${cmd}. Digite /help.`);
  };

  const onSubmit = async () => {
    const v = input;
    setInput("");
    await run(v);
  };

  if (!isOwner) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-emerald-500/20 bg-black/60">
        <TerminalSquare className="h-5 w-5 text-emerald-400" />
        <span className="font-semibold text-emerald-300 flex-1">Painel de Comandos • Dono</span>
        {event && (
          <span className="text-[11px] font-mono text-emerald-400 mr-2">
            {event.title} · {formatCountdown(remainingMs)}
          </span>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed space-y-0.5">
        {lines.map((l) => (
          <div
            key={l.id}
            className={
              l.kind === "in"
                ? "text-emerald-300"
                : l.kind === "err"
                ? "text-red-400"
                : l.kind === "sys"
                ? "text-amber-400"
                : "text-zinc-200"
            }
          >
            <span className="whitespace-pre-wrap break-words">{l.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-emerald-500/20 bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) onSubmit();
            }}
            placeholder="Digite um comando… (ex: /help)"
            className="flex-1 bg-black/40 border-emerald-500/20 font-mono text-emerald-100 placeholder:text-zinc-500"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <Button size="icon" onClick={onSubmit} disabled={busy} className="shrink-0">
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
