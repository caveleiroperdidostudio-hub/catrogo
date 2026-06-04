/**
 * Newcatroid — linguagem de jogos do Catrogo (v1)
 *
 * Linha a linha. Comentários começam com "#".
 * As cores aceitam hex (#ff0) ou nomes básicos.
 *
 * CONFIGURAÇÃO
 *   fundo <cor>                         -> cor de fundo da cena
 *   gravidade <valor>                   -> aplica gravidade vertical (ex: 0.3)
 *   criar <nome> <x> <y> <cor> <tam>    -> cria um objeto quadrado
 *
 * EVENTOS / LAÇOS
 *   quando_tecla <tecla> mover <nome> <dx> <dy>
 *        teclas: esquerda, direita, cima, baixo, espaco
 *   sempre mover <nome> <dx> <dy>       -> executa todo quadro
 *   ao_tocar <a> <b> fim <mensagem>     -> encerra ao colidir
 *   ao_tocar <a> <b> pontos <n>         -> soma pontos e reposiciona <b>
 */

export type Sprite = {
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
};

type KeyRule = { key: string; name: string; dx: number; dy: number };
type AlwaysRule = { name: string; dx: number; dy: number };
type Collision = { a: string; b: string; action: "fim" | "pontos"; arg: string };

export type ParseResult = {
  background: string;
  gravity: number;
  sprites: Sprite[];
  keyRules: KeyRule[];
  alwaysRules: AlwaysRule[];
  collisions: Collision[];
  errors: string[];
};

const KEY_MAP: Record<string, string> = {
  esquerda: "ArrowLeft",
  direita: "ArrowRight",
  cima: "ArrowUp",
  baixo: "ArrowDown",
  espaco: " ",
};

const NAMED_COLORS: Record<string, string> = {
  vermelho: "#ef4444",
  verde: "#22c55e",
  azul: "#3b82f6",
  amarelo: "#eab308",
  roxo: "#a855f7",
  rosa: "#ec4899",
  branco: "#ffffff",
  preto: "#000000",
  laranja: "#f97316",
  ciano: "#06b6d4",
};

function color(token: string): string {
  if (!token) return "#ffffff";
  if (token.startsWith("#")) return token;
  return NAMED_COLORS[token.toLowerCase()] ?? token;
}

export function parseNewcatroid(code: string): ParseResult {
  const res: ParseResult = {
    background: "#0b0b1e",
    gravity: 0,
    sprites: [],
    keyRules: [],
    alwaysRules: [],
    collisions: [],
    errors: [],
  };
  const lines = code.split("\n");

  lines.forEach((raw, idx) => {
    const line = raw.split("#")[0].trim();
    if (!line) return;
    const t = line.split(/\s+/);
    const cmd = t[0].toLowerCase();
    const ln = idx + 1;

    try {
      switch (cmd) {
        case "fundo":
          res.background = color(t[1]);
          break;
        case "gravidade":
          res.gravity = Number(t[1]) || 0;
          break;
        case "criar": {
          const [, name, x, y, c, size] = t;
          if (!name) throw new Error("nome do objeto faltando");
          res.sprites.push({
            name,
            x: Number(x) || 0,
            y: Number(y) || 0,
            color: color(c),
            size: Number(size) || 20,
            vx: 0,
            vy: 0,
          });
          break;
        }
        case "sempre": {
          if (t[1]?.toLowerCase() === "mover") {
            res.alwaysRules.push({ name: t[2], dx: Number(t[3]) || 0, dy: Number(t[4]) || 0 });
          } else throw new Error("após 'sempre' use 'mover'");
          break;
        }
        case "quando_tecla": {
          const key = KEY_MAP[t[1]?.toLowerCase()];
          if (!key) throw new Error(`tecla desconhecida: ${t[1]}`);
          if (t[2]?.toLowerCase() !== "mover") throw new Error("use 'mover' após a tecla");
          res.keyRules.push({ key, name: t[3], dx: Number(t[4]) || 0, dy: Number(t[5]) || 0 });
          break;
        }
        case "ao_tocar": {
          const [, a, b, action, ...rest] = t;
          if (action !== "fim" && action !== "pontos") throw new Error("ação deve ser 'fim' ou 'pontos'");
          res.collisions.push({ a, b, action, arg: rest.join(" ").replace(/^"|"$/g, "") });
          break;
        }
        default:
          throw new Error(`comando desconhecido: ${cmd}`);
      }
    } catch (e) {
      res.errors.push(`Linha ${ln}: ${(e as Error).message}`);
    }
  });

  return res;
}

export type RuntimeHandle = { stop: () => void };

export function runNewcatroid(
  canvas: HTMLCanvasElement,
  parsed: ParseResult,
  opts?: { onScore?: (n: number) => void; onEnd?: (msg: string) => void }
): RuntimeHandle {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  // clona sprites para não mutar o parse
  const sprites = parsed.sprites.map((s) => ({ ...s }));
  const byName = (n: string) => sprites.find((s) => s.name === n);
  const held = new Set<string>();
  let score = 0;
  let running = true;
  let raf = 0;

  const onKeyDown = (e: KeyboardEvent) => {
    if (Object.values(KEY_MAP).includes(e.key)) {
      held.add(e.key);
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => held.delete(e.key);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function overlap(a: Sprite, b: Sprite) {
    return a.x < b.x + b.size && a.x + a.size > b.x && a.y < b.y + b.size && a.y + a.size > b.y;
  }

  function clampReset(s: Sprite) {
    if (s.x < 0) s.x = 0;
    if (s.y < 0) s.y = 0;
    if (s.x + s.size > W) s.x = W - s.size;
    if (s.y + s.size > H) s.y = H - s.size;
  }

  function frame() {
    if (!running) return;

    // gravidade
    if (parsed.gravity) sprites.forEach((s) => (s.y += parsed.gravity));

    // sempre
    parsed.alwaysRules.forEach((r) => {
      const s = byName(r.name);
      if (s) {
        s.x += r.dx;
        s.y += r.dy;
        // reaparece do outro lado para inimigos em loop
        if (s.y > H) s.y = -s.size;
        if (s.x > W) s.x = -s.size;
      }
    });

    // teclas
    parsed.keyRules.forEach((r) => {
      if (held.has(r.key)) {
        const s = byName(r.name);
        if (s) {
          s.x += r.dx;
          s.y += r.dy;
        }
      }
    });

    sprites.forEach(clampReset);

    // colisões
    for (const col of parsed.collisions) {
      const a = byName(col.a);
      const b = byName(col.b);
      if (a && b && overlap(a, b)) {
        if (col.action === "fim") {
          end(col.arg || "Fim de jogo");
          return;
        }
        if (col.action === "pontos") {
          score += Number(col.arg) || 1;
          opts?.onScore?.(score);
          // reposiciona o segundo objeto aleatoriamente
          b.x = Math.random() * (W - b.size);
          b.y = Math.random() * (H - b.size);
        }
      }
    }

    // desenho
    ctx.fillStyle = parsed.background;
    ctx.fillRect(0, 0, W, H);
    sprites.forEach((s) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    });

    raf = requestAnimationFrame(frame);
  }

  function end(msg: string) {
    running = false;
    cancelAnimationFrame(raf);
    opts?.onEnd?.(msg);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  raf = requestAnimationFrame(frame);
  return { stop };
}

export const NEWCATROID_EXAMPLE = `# Jogo de exemplo: pegue as estrelas, fuja do inimigo!
fundo #0b0b1e
criar jogador 160 260 ciano 24
criar estrela 80 60 amarelo 16
criar inimigo 160 0 vermelho 22

# controles
quando_tecla esquerda mover jogador -6 0
quando_tecla direita mover jogador 6 0
quando_tecla cima mover jogador 0 -6
quando_tecla baixo mover jogador 0 6

# o inimigo cai sempre
sempre mover inimigo 0 3

# regras
ao_tocar jogador estrela pontos 1
ao_tocar jogador inimigo fim Você foi pego! 🚀`;
