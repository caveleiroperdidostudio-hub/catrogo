import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_ALLOWED_ROUTES, isAllowedPage } from "@/lib/app-nav";

const Input = z.object({ message: z.string().min(1).max(500) });

const LIST = AI_ALLOWED_ROUTES.map((r) => `${r.id} = ${r.label} (${r.aliases.join(", ")})`).join("\n");

const SYSTEM = `Você decide se a mensagem do usuário pede para ABRIR uma tela do app CatroGo.
Telas permitidas:
${LIST}

Responda SOMENTE com JSON puro:
{"page":"<id ou null>","needs_confirm":false,"say":"<frase curta em português>"}
Regras:
- Use exatamente um dos ids da lista, ou null quando a mensagem não pedir para abrir uma tela.
- needs_confirm = true apenas quando a intenção não estiver clara.
- Nunca invente ids fora da lista. Nunca abra telas administrativas.`;

export const aiNavigate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { aiJson } = await import("@/lib/ai-core.server");
    const { data: flag } = await context.supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "ai_navigation_enabled")
      .maybeSingle();
    if (flag && flag.enabled === false) return { page: null, say: null, needs_confirm: false };

    const raw = await aiJson<{ page: string | null; needs_confirm?: boolean; say?: string }>(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: data.message },
      ],
      { page: null },
    );

    const page = raw.page && isAllowedPage(raw.page) ? raw.page : null;
    const allowed = page !== null;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ai_navigation_logs").insert({
        user_id: context.userId,
        tool: "open_app_page",
        target: raw.page ?? "none",
        allowed,
        reason: allowed ? "rota permitida" : "sem rota correspondente",
      });
    } catch {
      /* registro não deve quebrar a navegação */
    }

    return {
      page,
      needs_confirm: Boolean(raw.needs_confirm) && allowed,
      say: allowed ? (raw.say ?? null) : null,
    };
  });
