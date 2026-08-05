/**
 * Núcleo de IA do CatroGo.
 * Cadeia de provedores: Lovable AI Gateway → Jarvis (parceiro) → OpenAI.
 * O Jarvis é a IA parceira do projeto privadojarvis.lovable.app: basta
 * configurar os segredos JARVIS_AI_URL (endpoint compatível com
 * /v1/chat/completions) e, opcionalmente, JARVIS_API_KEY.
 */
export type AiMsg = { role: string; content: string };

const LOVABLE_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function pick(res: Response) {
  if (!res.ok) return null;
  const json = await res.json();
  const text = (json?.choices?.[0]?.message?.content ?? "") as string;
  return text.trim() ? text.trim() : null;
}

async function callLovable(messages: AiMsg[], jsonMode: boolean) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const body: Record<string, unknown> = { model: "openai/gpt-5.6-sol", reasoning_effort: "none", messages };
  if (jsonMode) body.response_format = { type: "json_object" };
  try {
    return await pick(
      await fetch(LOVABLE_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify(body),
      }),
    );
  } catch {
    return null;
  }
}

async function callJarvis(messages: AiMsg[], jsonMode: boolean) {
  const url = process.env.JARVIS_AI_URL;
  if (!url) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const jk = process.env.JARVIS_API_KEY;
  if (jk) headers.Authorization = `Bearer ${jk}`;
  const body: Record<string, unknown> = { model: process.env.JARVIS_MODEL ?? "jarvis-1", messages };
  if (jsonMode) body.response_format = { type: "json_object" };
  try {
    return await pick(await fetch(url, { method: "POST", headers, body: JSON.stringify(body) }));
  } catch {
    return null;
  }
}

async function callOpenAi(messages: AiMsg[], jsonMode: boolean) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const body: Record<string, unknown> = { model: "gpt-4o-mini", messages };
  if (jsonMode) body.response_format = { type: "json_object" };
  try {
    return await pick(
      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      }),
    );
  } catch {
    return null;
  }
}

export async function aiText(messages: AiMsg[], jsonMode = false): Promise<string> {
  const out =
    (await callLovable(messages, jsonMode)) ??
    (await callJarvis(messages, jsonMode)) ??
    (await callOpenAi(messages, jsonMode));
  if (!out) throw new Error("A IA está indisponível agora (sem créditos ou provedor fora do ar). Tente novamente em instantes.");
  return out;
}

export async function aiJson<T>(messages: AiMsg[], fallback: T): Promise<T> {
  try {
    const raw = await aiText(messages, true);
    const clean = raw.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return fallback;
  }
}

/** Gera uma imagem e devolve um data URL (png/jpeg base64). */
export async function aiImage(prompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Geração de imagens indisponível agora.");
  const res = await fetch(LOVABLE_CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) throw new Error("Não consegui gerar a imagem agora. Tente novamente.");
  const json = await res.json();
  const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
  if (!url) throw new Error("A IA não devolveu imagem. Tente descrever de outro jeito.");
  return url;
}

/** Provedores ativos (para exibir status na interface). */
export function aiProviders() {
  return {
    lovable: !!process.env.LOVABLE_API_KEY,
    jarvis: !!process.env.JARVIS_AI_URL,
    openai: !!process.env.OPENAI_API_KEY,
  };
}
