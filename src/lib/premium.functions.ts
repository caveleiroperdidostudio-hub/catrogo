import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generatePixBrCode } from "@/lib/pix-brcode";

/** Chave PIX da empresa (CPF). */
const COMPANY_PIX_KEY = "07533111273";
const COMPANY_NAME = "CATROGO";
const COMPANY_CITY = "SAO PAULO";

const PLANS: Record<string, { price: number; days: number; name: string }> = {
  mensal: { price: 9.9, days: 30, name: "Mensal" },
  anual: { price: 79.9, days: 365, name: "Anual" },
};

const PixInput = z.object({ plan: z.enum(["mensal", "anual"]) });

/** Gera o código PIX (BR Code + QR Code) para o plano escolhido. */
export const generatePixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PixInput.parse(input))
  .handler(async ({ data }) => {
    const plan = PLANS[data.plan];
    if (!plan) throw new Error("Plano inválido");

    const brCode = generatePixBrCode({
      pixKey: COMPANY_PIX_KEY,
      amount: plan.price,
      merchantName: COMPANY_NAME,
      merchantCity: COMPANY_CITY,
      txid: "***",
      description: `Premium ${plan.name} CatroGo`,
    });

    // Gera o QR Code como data URL (png base64)
    let qrCode: string | null = null;
    try {
      const QRCode = (await import("qrcode")).default;
      qrCode = await QRCode.toDataURL(brCode, { margin: 1, width: 320 });
    } catch {
      /* QR code opcional — se falhar, só retornamos o BR Code */
    }

    return {
      brCode,
      qrCode,
      amount: plan.price,
      planName: plan.name,
      days: plan.days,
      pixKey: COMPANY_PIX_KEY,
    };
  });

const ActivateInput = z.object({
  plan: z.enum(["mensal", "anual"]),
  note: z.string().max(500).optional(),
});

/** Confirma o pagamento PIX e ativa o Premium automaticamente. */
export const activatePremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivateInput.parse(input))
  .handler(async ({ data, context }) => {
    // Tenta o RPC de auto-ativação (requer a migration self_activate_premium)
    const { data: result, error } = await context.supabase.rpc("self_activate_premium", {
      _plan: data.plan,
      _note: data.note ?? null,
    });
    if (!error) {
      const res = result as { ok?: boolean; error?: string; expires_at?: string; days?: number };
      if (res?.ok) return { ok: true, expiresAt: res.expires_at, days: res.days, auto: true };
      throw new Error(res?.error ?? "Falha ao ativar premium");
    }

    // Fallback: se o RPC não existe ainda, cria o pedido como pendente
    // (o dono aprova manualmente). A migration precisa ser aplicada para
    // liberação automática.
    if (/could not find|does not exist|function/i.test(error.message)) {
      const { error: insErr } = await context.supabase.from("premium_requests").insert({
        user_id: context.userId,
        plan: data.plan,
        note: data.note?.trim() || null,
        status: "pendente",
      });
      if (insErr) throw new Error(insErr.message);
      return {
        ok: true,
        auto: false,
        message: "Pedido enviado! O dono vai confirmar o Pix e liberar seu Premium.",
      };
    }

    throw new Error(error.message);
  });
