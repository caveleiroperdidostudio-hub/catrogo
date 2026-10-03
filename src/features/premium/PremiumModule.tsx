import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Crown, Copy, Check, Loader2, Gift, Sparkles, ShieldCheck, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PIX_KEY, buildPixPayload } from "@/lib/pix";

export const PIX_KEYS = [{ label: "E-mail", value: PIX_KEY }];

/** Plano único do Ctrg OS. */
const PLAN = { id: "mensal", name: "Ctrg OS", price: "R$ 15,63", amount: 15.63, days: 30 };

const PERKS = [
  "Tema Glass UI, exclusivo do Ctrg OS",
  "Temas, auras e efeitos visuais extras",
  "IA com respostas mais longas e prioridade",
  "Figurinhas por IA ilimitadas",
];

type Req = { id: string; user_id: string; plan: string; note: string | null; status: string; created_at: string };

/** Aba Ctrg OS: assinatura, Pix automático e painel de aprovação do dono. */
export function PremiumModule() {
  const { user, isOwner } = useAuth();
  const [premium, setPremium] = useState(false);
  const [expires, setExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Req[]>([]);
  const [pending, setPending] = useState<Req[]>([]);
  const [giftName, setGiftName] = useState("");
  const [giftDays, setGiftDays] = useState("");

  // Pix Copia e Cola já com o valor do Ctrg OS embutido — nada para digitar.
  const pixPayload = useMemo(
    () => buildPixPayload({ amount: PLAN.amount, txid: "CTRGOS" }),
    [],
  );

  const load = async () => {
    if (!user) return setLoading(false);
    const [{ data: isP }, { data: sub }, { data: reqs }] = await Promise.all([
      supabase.rpc("is_premium", { _user_id: user.id }),
      supabase.from("premium_subscriptions").select("expires_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("premium_requests").select("id, user_id, plan, note, status, created_at").order("created_at", { ascending: false }),
    ]);
    setPremium(!!isP);
    setExpires(sub?.expires_at ?? null);
    const all = (reqs ?? []) as Req[];
    setMine(all.filter((r) => r.user_id === user.id));
    setPending(all.filter((r) => r.status === "pendente"));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const copyPix = async () => {
    await navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    toast.success("Pix Copia e Cola copiado");
    setTimeout(() => setCopied(false), 1500);
  };

  const sendRequest = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("premium_requests").insert({
      user_id: user.id,
      plan: PLAN.id,
      pix_key_used: PIX_KEY,
      note: note.trim() || null,
      status: "pendente",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado! Assim que o Pix for confirmado, o Ctrg OS é liberado.");
    setNote("");
    load();
  };

  const review = async (id: string, approve: boolean, days: number) => {
    const { data, error } = await supabase.rpc("review_premium_request", { _id: id, _approve: approve, _days: days });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(res?.error ?? error?.message ?? "Falha");
    toast.success(approve ? "Ctrg OS liberado!" : "Pedido recusado");
    load();
  };

  const gift = async () => {
    const { data, error } = await supabase.rpc("grant_premium", {
      _username: giftName.trim(),
      _days: giftDays ? Number(giftDays) : undefined,
    });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(res?.error ?? error?.message ?? "Falha ao dar Ctrg OS");
    toast.success(`@${giftName.trim()} agora tem o Ctrg OS${giftDays ? ` por ${giftDays} dias` : " para sempre"}`);
    setGiftName("");
    setGiftDays("");
    load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-4">
        <div className="cosmic-glow flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/20">
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">Ctrg OS</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {loading
              ? "Carregando…"
              : premium
                ? expires
                  ? `Ativo até ${new Date(expires).toLocaleDateString("pt-BR")}`
                  : "Ativo para sempre"
                : `${PLAN.price} por mês · cancele quando quiser`}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <ul className="space-y-2 rounded-2xl glass border border-white/10 p-4 text-sm">
          {PERKS.map((p) => (
            <li key={p} className="flex gap-2 text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {p}
            </li>
          ))}
        </ul>

        {!premium && (
          <div className="space-y-3 rounded-2xl glass border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <QrCode className="h-4 w-4 text-primary" /> Pagar com Pix
              </div>
              <span className="text-sm font-semibold">{PLAN.price}</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-white p-3">
                <QRCodeSVG value={pixPayload} size={168} level="M" bgColor="#ffffff" fgColor="#0b0b12" />
              </div>
              <div className="w-full space-y-1.5">
                <Label className="text-xs">Pix Copia e Cola</Label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-secondary/30 p-2">
                  <div className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{pixPayload}</div>
                  <Button size="icon" variant="ghost" onClick={copyPix} aria-label="Copiar Pix Copia e Cola">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">Chave: {PIX_KEY}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Comprovante (opcional)</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cole o ID da transação Pix"
              />
            </div>
            <Button className="cosmic-glow w-full" onClick={sendRequest} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Já paguei
            </Button>
            {mine.length > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {mine.slice(0, 3).map((r) => (
                  <div key={r.id}>
                    {new Date(r.created_at).toLocaleDateString("pt-BR")} · <span className="text-foreground">{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {premium && (
          <div className="flex items-center gap-2 rounded-2xl glass border border-primary/25 p-4 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> Ctrg OS ativo. Ajuste o tema em Perfil → Configurações → Aparência.
          </div>
        )}

        {isOwner && (
          <div className="space-y-3 rounded-2xl glass border border-white/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="h-4 w-4 text-primary" /> Dar Ctrg OS (dono)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Usuário (@)</Label>
                <Input value={giftName} onChange={(e) => setGiftName(e.target.value)} placeholder="ex: joao" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dias</Label>
                <Input value={giftDays} onChange={(e) => setGiftDays(e.target.value.replace(/\D/g, ""))} placeholder="∞" />
              </div>
            </div>
            <Button onClick={gift} disabled={!giftName.trim()} className="w-full">
              Conceder Ctrg OS
            </Button>

            <div className="flex items-center gap-2 pt-1 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Pix pendentes
            </div>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum pedido pendente.</p>
            ) : (
              pending.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 p-2 text-sm">
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                  {r.note && <div className="mt-1 text-xs">{r.note}</div>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => review(r.id, true, PLAN.days)}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => review(r.id, false, 0)}>
                      Recusar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
