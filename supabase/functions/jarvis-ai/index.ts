import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é Jarvis, a IA do app CatroGo (similar ao Privado Jarvis, https://privadojarvis.lovable.app).
Você é amigável, direto, objetivo e útil. Responde em português brasileiro a menos que o usuário fale outro idioma.
Pode redigir mensagens, traduzir, resumir, dar ideias, explicar coisas, ajudar com decisões.
Mantenha respostas curtas e conversacionais quando possível, como uma mensagem de chat.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { conversationId, mode, userMessage } = await req.json();
    if (!conversationId || !mode) return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // verify membership using user-scoped client (RLS enforced)
    const { data: member } = await userClient.from("conversation_members").select("user_id").eq("conversation_id", conversationId).eq("user_id", user.id).maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: "not a member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // load last 20 messages with user client
    const { data: msgs } = await userClient.from("messages").select("content, sender_id, is_ai, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(40);
    const history = (msgs ?? []).map((m) => ({
      role: m.is_ai ? "assistant" : (m.sender_id === user.id ? "user" : "user"),
      content: m.is_ai ? m.content : `${m.content}`,
    }));

    if (mode === "reply") {
      const messages = [
        { role: "system", content: SYSTEM },
        ...history,
      ];
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        return new Response(JSON.stringify({ error: `AI ${aiRes.status}: ${t}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await aiRes.json();
      const reply = data.choices?.[0]?.message?.content?.trim() ?? "(sem resposta)";

      // insert with service role so sender_id can be null and bypass member-as-self check
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await admin.from("messages").insert({ conversation_id: conversationId, sender_id: null, is_ai: true, content: reply });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "suggest") {
      const tail = history.slice(-10).map((h) => `${h.role === "user" ? "Outro" : "Eu"}: ${h.content}`).join("\n");
      const prompt = `Considere a conversa abaixo e sugira EXATAMENTE 3 respostas curtas e naturais (no máximo 12 palavras cada) que o usuário poderia enviar. Responda APENAS com um JSON no formato {"suggestions":["...","...","..."]} sem texto adicional.\n\nConversa:\n${tail || "(vazia)"}\n\nUserMessage opcional: ${userMessage ?? ""}`;
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: "Você é um assistente que retorna apenas JSON válido." }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        return new Response(JSON.stringify({ error: `AI ${aiRes.status}: ${t}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await aiRes.json();
      let suggestions: string[] = [];
      try {
        const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
      } catch { suggestions = []; }
      return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
