import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export const generateGame = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
    if (!res.ok) throw new Error("Falha ao gerar o jogo. Tente novamente.");

    const json = await res.json();
    let code: string = json?.choices?.[0]?.message?.content ?? "";
    // limpa eventuais cercas de código
    code = code.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
    return { code };
  });
