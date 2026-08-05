import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiImage, aiJson, aiProviders, aiText } from "@/lib/ai-core.server";

/* ---------------- Imagens ---------------- */

export const aiGenerateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ prompt: z.string().min(2).max(600) }).parse(i))
  .handler(async ({ data }) => ({ dataUrl: await aiImage(data.prompt) }));

/* ---------------- Figurinhas sugeridas pela IA ---------------- */

export const aiStickerIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ query: z.string().min(2).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const ideas = await aiJson<{ ideas: { emoji: string; prompt: string; label: string }[] }>(
      [
        {
          role: "system",
          content:
            'Você cria ideias de FIGURINHAS (stickers) de mensageiro. Responda só JSON: {"ideas":[{"emoji":"😄","label":"nome curto","prompt":"descrição visual em inglês para gerar a imagem, estilo sticker, fundo branco sólido, contorno grosso, arte vetorial fofa"}]}. Gere exatamente 3 ideias.',
        },
        { role: "user", content: `Tema: ${data.query}` },
      ],
      { ideas: [] },
    );
    const list = (ideas.ideas ?? []).slice(0, 3);
    const out: { emoji: string; label: string; dataUrl: string }[] = [];
    for (const idea of list) {
      try {
        const dataUrl = await aiImage(
          `${idea.prompt}. Sticker style, thick white outline, centered subject, on a solid white background, no text.`,
        );
        out.push({ emoji: idea.emoji || "✨", label: idea.label || data.query, dataUrl });
      } catch {
        /* ignora falha individual */
      }
    }
    return { stickers: out };
  });

/* ---------------- IA curadora de Mods ---------------- */

const MOD_SYSTEM = `Você é a "IA Curadora de Mods" do CatroGo. Mods são arquivos HTML/JS autônomos que rodam num sandbox (iframe) dentro do app.
Sua função: revisar, corrigir e MELHORAR o mod recebido.
Responda APENAS JSON válido no formato:
{"quality": 0-100, "review": "análise curta em pt-BR com pontos fortes e o que foi corrigido", "code": "<!DOCTYPE html>... o mod completo, corrigido e melhorado ..."}
REGRAS do código: um único arquivo HTML com CSS e JS embutidos, responsivo (mobile + PC), sem dependências externas nem CDNs, sem acesso a rede, sem localStorage do app, comentado em português, visual escuro/galáctico combinando com o CatroGo.`;

export const aiReviewMod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(1).max(120),
        description: z.string().max(600).optional(),
        code: z.string().max(120000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const res = await aiJson<{ quality: number; review: string; code: string }>(
      [
        { role: "system", content: MOD_SYSTEM },
        {
          role: "user",
          content: `Mod: ${data.title}\nDescrição: ${data.description ?? "—"}\n\nCódigo atual:\n${data.code || "(vazio — crie um mod novo com base no título)"}`,
        },
      ],
      { quality: 0, review: "", code: "" },
    );
    const code = (res.code ?? "").replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
    return {
      quality: Math.max(0, Math.min(100, Math.round(res.quality ?? 0))),
      review: res.review || "Revisão indisponível.",
      code,
    };
  });

/* ---------------- IA Personal: idiomas ---------------- */

export const aiLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ track: z.string().min(2).max(40), level: z.number().int().min(1).max(99) }).parse(i),
  )
  .handler(async ({ data }) => {
    const lesson = await aiJson<{
      topic: string;
      tip: string;
      questions: { prompt: string; options: string[]; answer: number; explain: string }[];
    }>(
      [
        {
          role: "system",
          content:
            'Você é professor de idiomas gamificado (estilo Duolingo) em pt-BR. Responda só JSON: {"topic":"tema da lição","tip":"dica curta","questions":[{"prompt":"pergunta","options":["a","b","c","d"],"answer":0,"explain":"por quê"}]}. Gere exatamente 5 questões de múltipla escolha, cada uma com 4 opções e apenas uma correta. Dificuldade proporcional ao nível informado.',
        },
        { role: "user", content: `Idioma: ${data.track}. Nível do aluno: ${data.level}.` },
      ],
      { topic: "", tip: "", questions: [] },
    );
    return {
      topic: lesson.topic || data.track,
      tip: lesson.tip || "",
      questions: (lesson.questions ?? []).slice(0, 5).map((q) => ({
        prompt: q.prompt,
        options: (q.options ?? []).slice(0, 4),
        answer: Math.max(0, Math.min(3, q.answer ?? 0)),
        explain: q.explain ?? "",
      })),
    };
  });

/* ---------------- IA Personal: treino físico ---------------- */

export const aiWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        goal: z.string().min(2).max(120),
        minutes: z.number().int().min(5).max(120),
        level: z.string().min(2).max(40),
        equipment: z.string().max(120).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const plan = await aiText([
      {
        role: "system",
        content:
          "Você é um personal trainer virtual em pt-BR. Monte um treino seguro e prático em markdown: aquecimento, blocos com séries/repetições/tempo, alongamento e 3 dicas. Sem enrolação. Sempre lembre em uma linha final que dores ou condições de saúde pedem avaliação profissional.",
      },
      {
        role: "user",
        content: `Objetivo: ${data.goal}\nTempo disponível: ${data.minutes} minutos\nNível: ${data.level}\nEquipamentos: ${data.equipment || "nenhum (peso do corpo)"}`,
      },
    ]);
    return { plan };
  });

/* ---------------- Status dos provedores ---------------- */

export const aiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => aiProviders());
