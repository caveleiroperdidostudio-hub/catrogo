import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  prompt: z.string().min(1).max(500),
});

const SYSTEM = `Você é um assistente que cria jogos na linguagem "Newcatroid", uma linguagem simples linha a linha em português. Responda APENAS com o código do jogo, sem explicações, sem markdown, sem cercas de código.

COMANDOS DISPONÍVEIS:
# comentário (linhas começando com # são ignoradas)
fundo <cor>                          -> cor de fundo (ex: fundo #0b0b1e)
gravidade <valor>                    -> gravidade vertical (ex: gravidade 0.4)
criar <nome> <x> <y> <cor> <tam>     -> cria um objeto quadrado
quando_tecla <tecla> mover <nome> <dx> <dy>   -> teclas: esquerda, direita, cima, baixo, espaco
sempre mover <nome> <dx> <dy>        -> executa todo quadro
ao_tocar <a> <b> pontos <n>          -> soma n pontos e reposiciona <b>
ao_tocar <a> <b> fim <mensagem>      -> encerra o jogo ao colidir

CORES: hex (#ff0) ou nomes: vermelho, verde, azul, amarelo, roxo, rosa, branco, preto, laranja, ciano.
A área do jogo tem 320x320. Posicione objetos dentro dessa área.
Sempre inclua pelo menos um objeto controlado pelo jogador, uma forma de ganhar pontos e/ou de perder.`;

async function callGateway(messages: { role: string; content: string }[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
    }),
  });

  if (res.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
  if (res.status === 401) throw new Error("Chave da OpenAI inválida. Verifique a configuração.");
  if (!res.ok) throw new Error("Falha ao falar com a IA. Tente novamente.");

  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? "") as string;
}

export const generateGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    let code = await callGateway([
      { role: "system", content: SYSTEM },
      { role: "user", content: data.prompt },
    ]);
    // limpa eventuais cercas de código
    code = code.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
    return { code };
  });

/* ---------------- Assistente de chat (jogos + vídeos) ---------------- */

const CHAT_SYSTEM = `Você é o "Catrogo IA", um assistente criativo amigável que conversa em português do Brasil. Você ajuda usuários a:
1. Criar JOGOS na linguagem Newcatroid (descrita abaixo) — pode gerar o jogo inteiro, explicar linha a linha, ensinar a lógica, corrigir bugs e melhorar o código.
2. Ter IDEIAS DE VÍDEOS e SHORTS: roteiros, títulos chamativos, ganchos, descrições, hashtags e dicas de gravação.

ESTILO:
- Seja didático e encorajador. Explique conceitos como se ensinasse um iniciante.
- Quando o usuário pedir um jogo ou alterações no código, SEMPRE inclua o código completo dentro de um bloco markdown usando \`\`\`newcatroid no início e \`\`\` no final. Antes ou depois do bloco, explique em poucas frases o que o código faz ou o que você mudou.
- Quando o usuário só quiser entender o código, explique sem necessariamente reescrever tudo.
- Para vídeos, organize a resposta com listas e seja prático.

LINGUAGEM NEWCATROID (linha a linha, comentários começam com #):
fundo <cor>                          -> cor de fundo (ex: fundo #0b0b1e)
gravidade <valor>                    -> gravidade vertical (ex: gravidade 0.4)
criar <nome> <x> <y> <cor> <tam>     -> cria um objeto quadrado
quando_tecla <tecla> mover <nome> <dx> <dy>   -> teclas: esquerda, direita, cima, baixo, espaco
sempre mover <nome> <dx> <dy>        -> executa todo quadro
ao_tocar <a> <b> pontos <n>          -> soma n pontos e reposiciona <b>
ao_tocar <a> <b> fim <mensagem>      -> encerra o jogo ao colidir
CORES: hex (#ff0) ou nomes: vermelho, verde, azul, amarelo, roxo, rosa, branco, preto, laranja, ciano.
A área do jogo tem 320x320. Mantenha objetos dentro dela.`;

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
  currentCode: z.string().max(8000).optional(),
});

export const chatAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const context = data.currentCode
      ? [
          {
            role: "system",
            content: `O usuário está editando este jogo no momento:\n\`\`\`newcatroid\n${data.currentCode}\n\`\`\``,
          },
        ]
      : [];
    const reply = await callGateway([
      { role: "system", content: CHAT_SYSTEM },
      ...context,
      ...data.messages,
    ]);
    return { reply };
  });

/* ---------------- Gerador de jogos completos em HTML ---------------- */

const HTML_GAME_SYSTEM = `Você é um engenheiro de jogos sênior. Gere um JOGO COMPLETO em um ÚNICO arquivo HTML.
REGRAS OBRIGATÓRIAS:
- Responda APENAS com o código HTML puro, começando em <!DOCTYPE html> e terminando em </html>. Sem markdown, sem cercas de código, sem explicações.
- Todo o CSS e JavaScript devem estar embutidos (inline) no mesmo arquivo.
- O jogo deve ser TOTALMENTE responsivo e funcionar tanto em MOBILE quanto em PC.
- Suporte a controles de TOQUE (botões na tela / gestos) para celular E controles de TECLADO (setas, WASD, espaço) para PC.
- Use <canvas> quando fizer sentido, com requestAnimationFrame para o loop.
- Inclua: tela inicial, pontuação, condição de vitória/derrota e botão de reiniciar.
- Código LIMPO, comentado em português, sem dependências externas nem CDNs (100% offline).
- Layout deve ocupar 100% da viewport e escalar corretamente (viewport meta tag incluída).`;

export const generateHtmlGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    let html = await callGateway([
      { role: "system", content: HTML_GAME_SYSTEM },
      { role: "user", content: data.prompt },
    ]);
    html = html.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
    const idx = html.toLowerCase().indexOf("<!doctype");
    if (idx > 0) html = html.slice(idx);
    return { html };
  });

/* ---------------- Assistente geral da plataforma (Catrogo IA) ---------------- */

const PLATFORM_SYSTEM = `Você é a "Catrogo IA", a inteligência artificial nativa e oficial do app Catrogo — uma plataforma brasileira que reúne: chat em tempo real (com chamadas de voz e vídeo), vídeos longos, shorts, jogos criados por IA, mods e modpacks, uma loja com a moeda "CatCoins" (hype), perfis/canais e eventos globais.

Seu papel:
- Responder QUALQUER dúvida do usuário de forma clara, rápida e amigável, em português do Brasil.
- Explicar como usar os recursos do Catrogo (postar vídeos, criar jogos, comprar na loja, dar hype, chamadas, mods, etc.).
- Ajudar com ideias criativas: roteiros de vídeos/shorts, conceitos de jogos, nomes de canais, estratégias de crescimento.
- Ajudar com programação, texto, resumos, traduções e brainstorming em geral.

Estilo:
- Seja direto e prático. Use listas e markdown quando ajudar na leitura.
- Seja acolhedor e motivador, mas sem enrolação.
- Quando gerar código, use blocos de código markdown com a linguagem correta.`;

export const platformAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const reply = await callGateway([
      { role: "system", content: PLATFORM_SYSTEM },
      ...data.messages,
    ]);
    return { reply };
  });
