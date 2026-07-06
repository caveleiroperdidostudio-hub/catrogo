import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é Carlos, a IA nativa do app Cosmos Chat.
Você é amigável, direto, criativo e cósmico. Responde em português brasileiro a menos que o usuário fale outro idioma.
Quando alguém te invocar com @carlos no meio de um chat, responda APENAS à pergunta direcionada a você, mantendo a resposta breve e útil — como uma mensagem de chat. Pode redigir mensagens, traduzir, resumir, dar ideias, explicar coisas e ajudar em decisões.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function aiCall(messages: Array<{ role: string; content: string }>, jsonMode = false) {
  const body: Record<string, unknown> = { model: "gpt-4o-mini", messages };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const payload = await req.json();
    const { conversationId, mode, userMessage, text, targetLang } = payload as {
      conversationId?: string;
      mode: "reply" | "suggest" | "summarize" | "translate" | "mention";
      userMessage?: string;
      text?: string;
      targetLang?: string;
    };
    if (!mode) return json({ error: "bad request" }, 400);

    // Modo translate não precisa de conversa
    if (mode === "translate") {
      if (!text) return json({ error: "missing text" }, 400);
      const out = await aiCall([
        { role: "system", content: "Você é um tradutor. Responda apenas com a tradução, sem comentários." },
        { role: "user", content: `Traduza para ${targetLang ?? "inglês"}:\n\n${text}` },
      ]);
      return json({ translation: out });
    }

    if (!conversationId) return json({ error: "missing conversationId" }, 400);

    // verifica membership
    const { data: member } = await userClient
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return json({ error: "not a member" }, 403);

    const { data: msgs } = await userClient
      .from("messages")
      .select("content, sender_id, is_ai, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);
    const history = (msgs ?? []).map((m) => ({
      role: m.is_ai ? "assistant" : "user",
      content: m.content,
    }));

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (mode === "reply") {
      const reply = await aiCall([{ role: "system", content: SYSTEM }, ...history]);
      await admin.from("messages").insert({
        conversation_id: conversationId, sender_id: null, is_ai: true, content: reply,
      });
      return json({ ok: true });
    }

    if (mode === "mention") {
      // resposta direta a um @carlos dentro de um chat (não-Carlos)
      const question = userMessage ?? "";
      const ctx = history.slice(-12).map((h) => `${h.role === "assistant" ? "Carlos" : "Alguém"}: ${h.content}`).join("\n");
      const reply = await aiCall([
        { role: "system", content: SYSTEM + "\nResponda direto à última pergunta marcada com @carlos. Seja breve." },
        { role: "user", content: `Contexto recente:\n${ctx}\n\nPergunta: ${question.replace(/^@carlos\s*/i, "")}` },
      ]);
      await admin.from("messages").insert({
        conversation_id: conversationId, sender_id: null, is_ai: true, content: reply,
      });
      return json({ ok: true });
    }

    if (mode === "summarize") {
      const joined = history.map((h) => `${h.role === "assistant" ? "Carlos" : "Pessoa"}: ${h.content}`).join("\n");
      const summary = await aiCall([
        { role: "system", content: "Resuma a conversa em até 6 bullet points curtos e úteis em pt-BR." },
        { role: "user", content: joined || "(conversa vazia)" },
      ]);
      return json({ summary });
    }

    if (mode === "suggest") {
      const tail = history.slice(-10).map((h) => `${h.role === "assistant" ? "Carlos" : "Outro"}: ${h.content}`).join("\n");
      const out = await aiCall([
        { role: "system", content: "Você é um assistente que retorna apenas JSON válido." },
        { role: "user", content: `Considere a conversa e sugira EXATAMENTE 3 respostas curtas (≤12 palavras) que o usuário poderia enviar. JSON: {"suggestions":["...","...","..."]}\n\n${tail || "(vazia)"}` },
      ], true);
      let suggestions: string[] = [];
      try {
        const parsed = JSON.parse(out || "{}");
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
      } catch { /* noop */ }
      return json({ suggestions });
    }

    return json({ error: "unknown mode" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
