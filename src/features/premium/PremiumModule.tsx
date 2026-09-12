import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Crown, Copy, Check, Loader2, Gift, Sparkles, ShieldCheck, QrCode, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generatePixPayment, activatePremium } from "@/lib/premium.functions";

const PLANS = [
  { id: "mensal", name: "Mensal", price: "R$ 9,90", days: 30 },
  { id: "anual", name: "Anual", price: "R$ 79,90", days: 365 },
];

const PERKS = [
  "Selo Premium dourado no perfil e nas conversas",
  "Temas e auras exclusivas",
  "IA com respostas mais longas e prioridade na fila",
  "Figurinhas por IA ilimitadas",
  "Personalizações exclusivas de interface",
  "Sem espera para resgatar recompensas de CatCoins",
];

type Req = { id: string; user_id: string; plan: string; note: string | null; status: string; created_at: string };

type PixData = {
  brCode: string;
  qrCode: string | null;
  amount: number;
  planName: string;
  days: number;
  pixKey: string;
};

type Step = "plans" | "payment" | "confirm" | "done";

/** Aba Premium: benefícios, pagamento por Pix automatizado e painel do dono. */
export function PremiumModule() {
  const { user, isOwner } = useAuth();
  const generatePix = useServerFn(generatePixPayment);
  const activate = useServerFn(activatePremium);
  const [premium, setPremium] = useState(false);
  const [expires, setExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(PLANS[0].id);
  const [step, setStep] = useState<Step>("plans");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Req[]>([]);
  const [pending, setPending] = useState<Req[]>([]);
  const [giftName, setGiftName] = useState("");
  const [giftDays, setGiftDays] = useState("");

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

  const copyBrCode = async () => {
    if (!pixData) return;
    await navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    toast.success("Código PIX copiado! Cole no seu app do banco.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuy = async () => {
    setBusy(true);
    try {
      const data = await generatePix({ data: { plan } });
      setPixData(data);
      setStep("payment");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Erro ao gerar PIX");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPayment = async () => {
    setBusy(true);
    try {
      const res = await activate({ data: { plan, note: note.trim() || undefined } });
      setStep("done");
      if (res.auto) {
        toast.success("Premium ativado automaticamente! 🎉");
      } else {
        toast.success(res.message ?? "Pedido enviado!");
      }
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Erro ao ativar premium");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep("plans");
    setPixData(null);
    setNote("");
  };

  const review = async (id: string, approve: boolean, days: number) => {
    const { data, error } = await supabase.rpc("review_premium_request", { _id: id, _approve: approve, _days: days });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(res?.error ?? error?.message ?? "Falha");
    toast.success(approve ? "Premium liberado!" : "Pedido recusado");
    load();
  };

  const gift = async () => {
    const { data, error } = await supabase.rpc("grant_premium", {
      _username: giftName.trim(),
      _days: giftDays ? Number(giftDays) : undefined,
    });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(res?.error ?? error?.message ?? "Falha ao dar premium");
    toast.success(`@${giftName.trim()} agora é Premium${giftDays ? ` por ${giftDays} dias` : " para sempre"}`);
    setGiftName("");
    setGiftDays("");
    load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-4">
        {step !== "plans" && step !== "done" && !premium && (
          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={reset}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="cosmic-glow flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/20">
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">Premium</div>
          <div className="text-[11px] text-muted-foreground">
            {loading ? "Carregando…" : premium ? (expires ? `Ativo até ${new Date(expires).toLocaleDateString("pt-BR")}` : "Ativo para sempre") : "Desbloqueie extras no CatroGo"}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* === Tela: planos === */}
        {(!premium || step === "plans") && step === "plans" && (
          <>
            <div className="glass rounded-2xl border border-primary/25 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> O que vem no Premium
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {PERKS.map((p) => (
                  <li key={p} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {p}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Premium só adiciona extras: nada do que já é gratuito no CatroGo fica bloqueado.
              </p>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-4">
              <div className="text-sm font-semibold">Escolha seu plano</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      plan === p.id ? "border-primary/60 bg-primary/15" : "border-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.price}</div>
                    {p.id === "anual" && (
                      <div className="mt-1 text-[10px] text-primary">Economize 33%</div>
                    )}
                  </button>
                ))}
              </div>
              <Button className="cosmic-glow mt-3 w-full" onClick={handleBuy} disabled={busy}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crown className="mr-1 h-4 w-4" />}
                Comprar Premium
              </Button>
              {mine.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {mine.slice(0, 3).map((r) => (
                    <div key={r.id}>
                      {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.plan} · <span className="text-foreground">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* === Tela: pagamento PIX === */}
        {step === "payment" && pixData && (
          <div className="glass rounded-2xl border border-white/10 p-4 space-y-4">
            <div className="text-center">
              <div className="text-sm font-semibold">Pague com PIX</div>
              <div className="text-xs text-muted-foreground">
                {pixData.planName} · {pixData.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>

            {/* QR Code */}
            {pixData.qrCode ? (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl bg-white p-3">
                  <img src={pixData.qrCode} alt="QR Code PIX" className="h-48 w-48" />
                </div>
                <p className="text-xs text-muted-foreground">Escaneie o QR Code no seu banco</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <QrCode className="h-12 w-12" />
                <p className="text-xs">QR Code indisponível — use o código abaixo.</p>
              </div>
            )}

            {/* Código copia e cola */}
            <div className="space-y-2">
              <Label>PIX Copia e Cola</Label>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-secondary/30 p-2.5">
                  <p className="break-all text-xs font-mono">{pixData.brCode}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={copyBrCode} className="shrink-0" aria-label="Copiar código PIX">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Como pagar:</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                <li>Copie o código PIX ou escaneie o QR Code</li>
                <li>Abra o app do seu banco e escolha pagar via PIX</li>
                <li>Cole o código ou escaneie o QR</li>
                <li>Confirme o pagamento de {pixData.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</li>
                <li>Volte aqui e clique em "Já paguei" abaixo</li>
              </ol>
            </div>

            <Button className="w-full" onClick={() => setStep("confirm")}>
              Já paguei — ativar Premium
            </Button>
          </div>
        )}

        {/* === Tela: confirmação === */}
        {step === "confirm" && (
          <div className="glass rounded-2xl border border-white/10 p-4 space-y-4">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <div className="mt-2 text-sm font-semibold">Confirme seu pagamento</div>
              <div className="text-xs text-muted-foreground">
                {pixData?.planName} · {pixData?.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Comprovante / ID da transação (opcional)</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cole o ID da transação PIX ou deixe em branco"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-secondary/30 p-3 text-xs text-muted-foreground">
              Ao confirmar, seu Premium será ativado automaticamente. O pagamento é registrado para conferência.
            </div>

            <Button className="cosmic-glow w-full" onClick={handleConfirmPayment} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Confirmar e ativar Premium
            </Button>
          </div>
        )}

        {/* === Tela: sucesso === */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="cosmic-glow flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{premium ? "Premium ativado! 🎉" : "Pedido enviado! ✅"}</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                {premium
                  ? "Seus benefícios já estão disponíveis. Aproveite o CatroGo Premium!"
                  : "O dono vai confirmar seu pagamento Pix e liberar seu Premium em breve."}
              </p>
            </div>
            <Button onClick={() => { reset(); load(); }} variant="outline">Voltar</Button>
          </div>
        )}

        {/* === Painel do dono === */}
        {isOwner && (
          <div className="glass space-y-3 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="h-4 w-4 text-primary" /> Dar Premium de graça (só o dono)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label>Usuário (@)</Label>
                <Input value={giftName} onChange={(e) => setGiftName(e.target.value)} placeholder="ex: joao" />
              </div>
              <div className="space-y-1.5">
                <Label>Dias</Label>
                <Input
                  value={giftDays}
                  onChange={(e) => setGiftDays(e.target.value.replace(/\D/g, ""))}
                  placeholder="∞"
                />
              </div>
            </div>
            <Button onClick={gift} disabled={!giftName.trim()} className="w-full">
              Conceder Premium
            </Button>

            <div className="flex items-center gap-2 pt-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Pedidos Pix pendentes
            </div>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum pedido pendente.</p>
            ) : (
              pending.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 p-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")} · plano {r.plan}
                  </div>
                  {r.note && <div className="mt-1 text-xs">{r.note}</div>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => review(r.id, true, r.plan === "anual" ? 365 : 30)}>
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
