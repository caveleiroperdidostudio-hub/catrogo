import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Crown, Copy, Check, Loader2, Gift, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const PIX_KEYS = [
  { label: "CPF", value: "07533111273" },
  { label: "E-mail", value: "petrosakiles@gmail.com" },
];

const PLANS = [
  { id: "mensal", name: "Mensal", price: "R$ 9,90", days: 30 },
  { id: "anual", name: "Anual", price: "R$ 79,90", days: 365 },
];

const PERKS = [
  "Selo Premium dourado no perfil e nas conversas",
  "Temas e auras exclusivas nas Skins",
  "IA Carlos com respostas mais longas e prioridade na fila",
  "Uploads maiores em vídeos, shorts e filmes",
  "Figurinhas por IA ilimitadas",
  "Sem espera para resgatar recompensas de CatCoins",
];

type Req = { id: string; user_id: string; plan: string; note: string | null; status: string; created_at: string };

/** Aba Premium: benefícios, pagamento por Pix e painel de aprovação do dono. */
export function PremiumModule() {
  const { user, isOwner } = useAuth();
  const [premium, setPremium] = useState(false);
  const [expires, setExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [plan, setPlan] = useState(PLANS[0].id);
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

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(v);
    toast.success("Chave Pix copiada");
    setTimeout(() => setCopied(null), 1500);
  };

  const sendRequest = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("premium_requests").insert({
      user_id: user.id,
      plan,
      pix_key_used: PIX_KEYS[0].value,
      note: note.trim() || null,
      status: "pendente",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado! O dono vai confirmar o Pix e liberar seu Premium.");
    setNote("");
    load();
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

        {!premium && (
          <div className="glass rounded-2xl border border-white/10 p-4">
            <div className="text-sm font-semibold">Pagar com Pix</div>
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
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {PIX_KEYS.map((k) => (
                <div key={k.value} className="flex items-center gap-2 rounded-xl border border-white/10 bg-secondary/30 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground">Chave Pix ({k.label})</div>
                    <div className="truncate text-sm font-medium">{k.value}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => copy(k.value)} aria-label={`Copiar chave ${k.label}`}>
                    {copied === k.value ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1.5">
              <Label>Comprovante / observação</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cole o ID da transação Pix ou descreva o pagamento"
              />
            </div>
            <Button className="cosmic-glow mt-3 w-full" onClick={sendRequest} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Já paguei, liberar meu Premium
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
        )}

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
