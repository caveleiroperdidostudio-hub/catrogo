/**
 * Núcleo de IA do CatroGo.
 * A ordem dos provedores, modelos, tempo limite e limites diários vêm da
 * tabela `ai_providers` (configurável no painel da equipe). As chaves ficam
 * sempre no servidor, em segredos (LOVABLE_API_KEY, OPENAI_API_KEY,
 * JARVIS_AI_URL/JARVIS_API_KEY…).
 */
import { platformFallback } from "@/lib/ai-fallback";

export type AiMsg = { role: string; content: string };

const LOVABLE_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ProviderRow = {
  slug: string;
  name: string;
  base_url: string;
  model: string;
  secret_name: string | null;
  priority: number;
  enabled: boolean;
  timeout_ms: number;
  user_daily_limit: number;
  global_daily_limit: number;
};

/** Fallback usado quando o banco está indisponível. */
const DEFAULTS: ProviderRow[] = [
  {
    slug: "lovable",
    name: "Lovable AI",
    base_url: LOVABLE_CHAT,
    model: "openai/gpt-5.6-sol",
    secret_name: "LOVABLE_API_KEY",
    priority: 1,
    enabled: true,
    timeout_ms: 45000,
    user_daily_limit: 0,
    global_daily_limit: 0,
  },
  {
    slug: "jarvis",
    name: "Jarvis",
    base_url: "",
    model: "jarvis-1",
    secret_name: "JARVIS_API_KEY",
    priority: 2,
    enabled: true,
    timeout_ms: 45000,
    user_daily_limit: 0,
    global_daily_limit: 0,
  },
  {
    slug: "openai",
    name: "OpenAI",
    base_url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    secret_name: "OPENAI_API_KEY",
    priority: 3,
    enabled: true,
    timeout_ms: 45000,
    user_daily_limit: 0,
    global_daily_limit: 0,
  },
];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadProviders(): Promise<ProviderRow[]> {
  try {
    const db = await admin();
    const { data } = await db
      .from("ai_providers")
      .select("slug, name, base_url, model, secret_name, priority, enabled, timeout_ms, user_daily_limit, global_daily_limit")
      .eq("enabled", true)
      .order("priority", { ascending: true });
    const rows = (data ?? []) as ProviderRow[];
    return rows.length ? rows : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

async function logUsage(entry: {
  userId?: string | null;
  slug: string;
  model: string;
  feature: string;
  success: boolean;
  error?: string | null;
}) {
  try {
    const db = await admin();
    await db.from("ai_usage").insert({
      user_id: entry.userId ?? null,
      provider_slug: entry.slug,
      model: entry.model,
      feature: entry.feature,
      success: entry.success,
      error: entry.error ?? null,
    });
  } catch {
    /* telemetria não deve quebrar a resposta */
  }
}

async function overLimit(p: ProviderRow, userId?: string | null) {
  if (!p.user_daily_limit && !p.global_daily_limit) return false;
  try {
    const db = await admin();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (p.global_daily_limit) {
      const { count } = await db
        .from("ai_usage")
        .select("id", { count: "exact", head: true })
        .eq("provider_slug", p.slug)
        .gte("created_at", since);
      if ((count ?? 0) >= p.global_daily_limit) return true;
    }
    if (p.user_daily_limit && userId) {
      const { count } = await db
        .from("ai_usage")
        .select("id", { count: "exact", head: true })
        .eq("provider_slug", p.slug)
        .eq("user_id", userId)
        .gte("created_at", since);
      if ((count ?? 0) >= p.user_daily_limit) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function pick(res: Response) {
  if (!res.ok) return null;
  const json = await res.json();
  const text = (json?.choices?.[0]?.message?.content ?? "") as string;
  return text.trim() ? text.trim() : null;
}

async function callProvider(p: ProviderRow, messages: AiMsg[], jsonMode: boolean) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url = p.base_url;
  const body: Record<string, unknown> = { model: p.model, messages };
  if (jsonMode) body.response_format = { type: "json_object" };

  if (p.slug === "lovable") {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return null;
    url = url || LOVABLE_CHAT;
    headers["Lovable-API-Key"] = key;
    body.reasoning_effort = "none";
  } else if (p.slug === "jarvis") {
    url = process.env.JARVIS_AI_URL ?? p.base_url;
    if (!url) return null;
    const jk = process.env.JARVIS_API_KEY;
    if (jk) headers.Authorization = `Bearer ${jk}`;
    body.model = process.env.JARVIS_MODEL ?? p.model;
  } else {
    const key = p.secret_name ? process.env[p.secret_name] : process.env.OPENAI_API_KEY;
    if (!key || !url) return null;
    headers.Authorization = `Bearer ${key}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), p.timeout_ms || 45000);
  try {
    return await pick(await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function aiText(
  messages: AiMsg[],
  jsonMode = false,
  opts: { feature?: string; userId?: string | null } = {},
): Promise<string> {
  const feature = opts.feature ?? "chat";
  const providers = await loadProviders();
  let lastError = "";
  for (const p of providers) {
    if (await overLimit(p, opts.userId)) {
      lastError = `Limite diário do provedor ${p.name} atingido`;
      continue;
    }
    const out = await callProvider(p, messages, jsonMode);
    if (out) {
      logUsage({ userId: opts.userId, slug: p.slug, model: p.model, feature, success: true });
      return out;
    }
    lastError = `Provedor ${p.name} indisponível`;
    logUsage({ userId: opts.userId, slug: p.slug, model: p.model, feature, success: false, error: lastError });
  }
  // Fallback local — a IA sempre responde, mesmo sem provedores externos
  return platformFallback(messages);
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
