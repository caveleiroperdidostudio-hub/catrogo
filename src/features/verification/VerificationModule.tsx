import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Send, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type VType = { key: string; label: string; icon: string; color: string; requirements: string };
type Req = {
  id: string;
  type_key: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
};
type Badge = { type_key: string; created_at: string };

const STATUS_LABEL: Record<string, string> = {
  pendente: "Em análise",
  aprovado: "Aprovado",
  rejeitado: "Recusado",
};

export function VerificationModule() {
  const { user } = useAuth();
  const [types, setTypes] = useState<VType[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typeKey, setTypeKey] = useState("");
  const [fullName, setFullName] = useState("");
  const [about, setAbout] = useState("");
  const [links, setLinks] = useState("");

  const load = async () => {
    const [t, r, b] = await Promise.all([
      supabase.from("verification_types").select("key, label, icon, color, requirements").eq("active", true),
      supabase
        .from("verification_requests")
        .select("id, type_key, status, reject_reason, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_badges").select("type_key, created_at"),
    ]);
    setTypes((t.data as VType[]) ?? []);
    setReqs((r.data as Req[]) ?? []);
    setBadges((b.data as Badge[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const submit = async () => {
    if (!typeKey) return toast.error("Escolha um tipo de selo");
    if (fullName.trim().length < 3) return toast.error("Informe seu nome completo");
    if (about.trim().length < 20) return toast.error("Conte um pouco mais sobre você (20+ caracteres)");
    setSending(true);
    const { error } = await supabase.from("verification_requests").insert({
      user_id: user!.id,
      type_key: typeKey,
      full_name: fullName.trim(),
      about: about.trim(),
      links: links
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado! A equipe vai analisar.");
    setAbout("");
    setLinks("");
    setTypeKey("");
    load();
  };

  const typeOf = (key: string) => types.find((t) => t.key === key);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-white/5">
        <BadgeCheck className="h-5 w-5 text-sky-400" />
        <span className="font-semibold flex-1">Verificação</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {badges.length > 0 && (
              <div className="rounded-2xl glass border border-white/10 p-4 space-y-2">
                <p className="text-sm font-semibold">Seus selos</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => {
                    const t = typeOf(b.type_key);
                    return (
                      <span
                        key={b.type_key}
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                        style={{ borderColor: `${t?.color ?? "#888"}55`, color: t?.color ?? undefined }}
                      >
                        <span>{t?.icon ?? "✅"}</span> {t?.label ?? b.type_key}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl glass border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldQuestion className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Pedir um selo</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {types.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTypeKey(t.key)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      typeKey === t.key ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-1">{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
              {typeKey && (
                <p className="text-[11px] text-muted-foreground">{typeOf(typeKey)?.requirements}</p>
              )}
              <Input
                placeholder="Nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Textarea
                placeholder="Conte quem você é, o que produz e por que merece o selo"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
                className="bg-white/5 border-white/10"
              />
              <Textarea
                placeholder="Links (um por linha): canal, portfólio, redes…"
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                rows={2}
                className="bg-white/5 border-white/10"
              />
              <Button onClick={submit} disabled={sending} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar pedido
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Meus pedidos</p>
              {reqs.length === 0 && (
                <p className="text-xs text-muted-foreground">Você ainda não pediu nenhum selo.</p>
              )}
              {reqs.map((r) => (
                <div key={r.id} className="rounded-xl glass border border-white/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{typeOf(r.type_key)?.icon ?? "✅"}</span>
                    <span className="flex-1 font-medium">{typeOf(r.type_key)?.label ?? r.type_key}</span>
                    <span
                      className={`text-[11px] rounded-full px-2 py-0.5 ${
                        r.status === "aprovado"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : r.status === "rejeitado"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  {r.reject_reason && (
                    <p className="mt-1 text-xs text-rose-300/80">Motivo: {r.reject_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
