import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

type GeneratedItem = {
  name: string;
  description: string;
  kind: "skin" | "badge" | "efeito";
  rarity: "comum" | "raro" | "epico" | "lendario";
  price: number;
  min_subscribers: number;
};

const RARITY_PRICE: Record<string, [number, number]> = {
  comum: [30, 80],
  raro: [90, 180],
  epico: [200, 400],
  lendario: [500, 1200],
};

function fallbackItems(): GeneratedItem[] {
  const pools = [
    { name: "Aura Nebulosa", kind: "efeito", rarity: "epico", description: "Um brilho roxo cósmico ao redor do avatar." },
    { name: "Selo de Pioneiro", kind: "badge", rarity: "raro", description: "Mostre que você chegou cedo no Catrogo." },
    { name: "Skin Neon", kind: "skin", rarity: "comum", description: "Visual vibrante em tons de neon." },
    { name: "Coroa Lendária", kind: "badge", rarity: "lendario", description: "Apenas para os maiores criadores." },
    { name: "Rastro Estelar", kind: "efeito", rarity: "raro", description: "Deixe um rastro de estrelas por onde passar." },
    { name: "Skin Holográfica", kind: "skin", rarity: "epico", description: "Reflexos holográficos em movimento." },
  ] as const;
  return pools.map((p) => {
    const [lo, hi] = RARITY_PRICE[p.rarity];
    return {
      name: p.name,
      description: p.description,
      kind: p.kind,
      rarity: p.rarity,
      price: Math.round(lo + Math.random() * (hi - lo)),
      min_subscribers: p.rarity === "lendario" ? 50 : p.rarity === "epico" ? 10 : 0,
    };
  });
}

async function aiItems(apiKey: string): Promise<GeneratedItem[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Você cria itens cosméticos para a loja rotativa de um super app brasileiro chamado Catrogo. Responda APENAS com JSON.",
        },
        {
          role: "user",
          content:
            'Gere 6 itens cosméticos criativos em português. Retorne um JSON {"items":[{"name","description","kind","rarity","price","min_subscribers"}]}. kind ∈ skin|badge|efeito. rarity ∈ comum|raro|epico|lendario. price entre 30 e 1200 coerente com a raridade. min_subscribers 0 para comum/raro, ~10 para epico, ~50 para lendario.',
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const items = (parsed.items ?? []) as GeneratedItem[];
  if (!Array.isArray(items) || items.length === 0) throw new Error("no items");
  return items.slice(0, 6);
}

export const Route = createFileRoute("/api/public/hooks/refresh-store")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require a shared secret to prevent unauthenticated store wipes / AI credit drain
        const expected = process.env.REFRESH_STORE_SECRET;
        const provided = request.headers.get("x-hook-secret") ?? "";
        const a = Buffer.from(provided);
        const b = Buffer.from(expected ?? "");
        const authorized =
          !!expected && a.length === b.length && timingSafeEqual(a, b);
        if (!authorized) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const apiKey = process.env.LOVABLE_API_KEY;

        let items: GeneratedItem[];
        try {
          items = apiKey ? await aiItems(apiKey) : fallbackItems();
        } catch {
          items = fallbackItems();
        }

        const valid = items.filter(
          (i) =>
            i.name &&
            ["skin", "badge", "efeito"].includes(i.kind) &&
            ["comum", "raro", "epico", "lendario"].includes(i.rarity),
        );

        // Deactivate the current rotation, then add the fresh items
        await supabaseAdmin.from("store_items").update({ active: false }).eq("active", true);

        const rows = valid.map((i) => ({
          name: i.name,
          description: i.description ?? null,
          kind: i.kind,
          rarity: i.rarity,
          price: Math.max(1, Math.round(i.price)),
          min_subscribers: Math.max(0, Math.round(i.min_subscribers ?? 0)),
          active: true,
        }));

        const { error } = await supabaseAdmin.from("store_items").insert(rows);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, generated: rows.length }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
