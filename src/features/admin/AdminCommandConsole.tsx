import { useEffect, useMemo, useRef, useState } from "react";
import { X, TerminalSquare, Sparkles, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useGlobalEvent, startEvent, stopEvent, adminGiveHype, formatCountdown } from "@/lib/events-context";
import { EventDesignModal, type EventDraft } from "./EventDesignModal";

type Line = { id: number; kind: "in" | "out" | "err" | "sys"; text: string };

/** Command created by the admin at runtime. */
type CustomCommand = { name: string; usage: string; desc: string };

type HelpCommand = { name: string; usage: string; desc: string };

const STORAGE_KEY = "catrogo-admin-commands";

const STATIC_HELP: HelpCommand[] = [
  { name: "/criar evento", usage: "/criar evento [missões] [tempo] [nome]", desc: "Abre o painel de design para criar um evento visual." },
  { name: "/criar commando", usage: "/criar commando [o que faz] [/sintaxe]", desc: "Registra um novo comando personalizado no terminal." },
  { name: "/evento", usage: "/evento <nome> <todos|id> [horas]", desc: "Dispara um evento global rápido (ex: /evento Natal todos)." },
  { name: "/give hype to", usage: "/give hype to <conta> <qtd>", desc: "Adiciona hype (CatCoins) ao saldo de um usuário." },
  { name: "/encerrar", usage: "/encerrar", desc: "Encerra o evento global ativo agora." },
  { name: "/help", usage: "/help", desc: "Lista todos os comandos disponíveis." },
  { name: "/ia", usage: "/ia", desc: "Lista os comandos personalizados criados por você." },
  { name: "/limpar", usage: "/limpar", desc: "Limpa o terminal." },
];

function loadCustom(): CustomCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomCommand[]) : [];
  } catch {
    return [];
  }
}

export function AdminCommandConsole({ onClose }: { onClose: () => void }) {
  const { isOwner } = useAuth();
  const { event, remainingMs, refresh } = useGlobalEvent();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>(() => loadCustom());
  const [busy, setBusy] = useState(false);
  const [designer, setDesigner] = useState<Partial<EventDraft> | null>(null);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (kind: Line["kind"], text: string) =>
    setLines((prev) => [...prev, { id: ++idRef.current, kind, text }]);

  // persist custom commands
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customCommands));
    } catch {
      /* ignore */
    }
  }, [customCommands]);

  // boot banner
  useEffect(() => {
    push("sys", "╔══════════════════════════════════════╗");
    push("sys", "  CATROGO • PAINEL DE COMANDOS (DONO)");
    push("sys", "╚══════════════════════════════════════╝");
    push("out", 'Digite "/help" para ver todos os comandos.');
    push("out", "Use /criar evento ou /criar commando para criar os seus próprios.");
    setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const allCommands = useMemo(() => [...STATIC_HELP, ...customCommands], [customCommands]);

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
      allCommands.forEach((c) => push("out", `  ${c.usage.padEnd(34)} ${c.desc}`));
      return;
    }

    if (lower === "/ia") {
      if (customCommands.length === 0) {
        push("out", "Nenhum comando personalizado ainda. Crie com /criar commando.");
      } else {
        push("out", `Comandos personalizados (${customCommands.length}):`);
        customCommands.forEach((c) => push("out", `  ${c.usage.padEnd(34)} ${c.desc}`));
      }
      return;
    }

    // /criar evento [missões] [tempo] [nome]  -> abre painel de design
    if (/^\/criar\s+evento/i.test(cmd)) {
      const rest = cmd.replace(/^\/criar\s+evento/i, "").trim();
      const m = rest.match(/\[([^\]]*)\]/g)?.map((s) => s.slice(1, -1).trim()) ?? [];
      const missionsCount = parseInt(m[0] ?? "", 10);
      const hours = parseInt((m[1] ?? "").replace(/[^0-9]/g, ""), 10);
      const name = m[2] || rest.replace(/\[[^\]]*\]/g, "").trim() || "Novo Evento";
      const missions =
        !isNaN(missionsCount) && missionsCount > 0
          ? Array.from({ length: Math.min(missionsCount, 10) }, (_, i) => ({
              key: `missao-${i + 1}`,
              label: `Complete a missão ${i + 1}`,
              coins: 500,
            }))
          : undefined;
      push("out", "🎨 Abrindo painel de design de eventos…");
      setDesigner({ name, durationHours: !isNaN(hours) && hours > 0 ? hours : 24, missions });
      return;
    }

    // /criar commando [o que faz] [/sintaxe]
    if (/^\/criar\s+comm?ando/i.test(cmd)) {
      const rest = cmd.replace(/^\/criar\s+comm?ando/i, "").trim();
      const brackets = rest.match(/\[([^\]]*)\]/g)?.map((s) => s.slice(1, -1).trim()) ?? [];
      const desc = brackets[0];
      let syntax = brackets[1] ?? "";
      if (!desc || !syntax) {
        return push("err", "Uso: /criar commando [o que o comando faz] [/exemplo [param]]");
      }
      if (!syntax.startsWith("/")) syntax = "/" + syntax;
      const name = syntax.split(/\s+/)[0].toLowerCase();
      if (STATIC_HELP.some((c) => name.startsWith(c.name))) {
        return push("err", `"${name}" é um comando reservado do sistema.`);
      }
      setCustomCommands((prev) => {
        const filtered = prev.filter((c) => c.name !== name);
        return [...filtered, { name, usage: syntax, desc }];
      });
      push("out", `✅ Comando ${name} registrado: ${syntax} — ${desc}`);
      push("out", `Agora você pode usar ${name} aqui no terminal.`);
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

    // custom commands
    const match = customCommands.find((c) => lower.startsWith(c.name));
    if (match) {
      push("out", `⚙️ Executando ${match.name} — ${match.desc}`);
      push("out", "✅ Comando personalizado executado com sucesso.");
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

      {designer && (
        <EventDesignModal
          initial={designer}
          onClose={() => setDesigner(null)}
          onCreated={async (msg) => {
            push("out", msg);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
