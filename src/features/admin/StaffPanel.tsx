import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, Check, X, Film, Flag, BadgeCheck, Cpu, KeyRound, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "verif" | "reports" | "movies" | "ai" | "perms" | "audit";

const TABS: { id: Tab; label: string; icon: typeof Flag; ownerOnly?: boolean }[] = [
  { id: "verif", label: "Selos", icon: BadgeCheck },
  { id: "reports", label: "Denúncias", icon: Flag },
  { id: "movies", label: "Filmes", icon: Film },
  { id: "ai", label: "IA", icon: Cpu },
  { id: "perms", label: "Permissões", icon: KeyRound, ownerOnly: true },
  { id: "audit", label: "Auditoria", icon: ScrollText },
];

const PERMISSIONS = [
  "users.view",
  "users.edit",
  "users.ban",
  "movies.publish",
  "movies.delete",
  "verification.review",
  "mods.review",
  "mods.publish",
  "reports.review",
  "audit.view",
  "ai.configure",
  "system.settings",
  "admin.manage",
];

export function StaffPanel() {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState<Tab>("verif");
  const tabs = TABS.filter((t) => !t.ownerOnly || isOwner);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-white/5">
        <ShieldCheck className="h-5 w-5 text-sky-400" />
        <span className="font-semibold flex-1">Painel da equipe</span>
      </div>
      <div className="shrink-0 flex gap-1 overflow-x-auto px-3 py-2 border-b border-white/5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition ${
                tab === t.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-white/5 text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === "verif" && <VerifQueue />}
        {tab === "reports" && <ReportsQueue />}
        {tab === "movies" && <MoviesQueue />}
        {tab === "ai" && <AiProviders />}
        {tab === "perms" && <PermsMatrix />}
        {tab === "audit" && <AuditLog />}
      </div>
    </div>
  );
}

function useList<T>(loader: () => Promise<T[]>, deps: unknown[] = []) {
  const [rows, setRows] = useState<T[] | null>(null);
  const reload = () => loader().then(setRows);
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { rows, reload };
}

function Loading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

/* ---------- Selos ---------- */
function VerifQueue() {
  const { rows, reload } = useList(async () => {
    const { data } = await supabase
      .from("verification_requests")
      .select("id, user_id, type_key, full_name, about, links, status, created_at")
      .eq("status", "pendente")
      .order("created_at");
    return data ?? [];
  });
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, approve: boolean) => {
    const reason = approve ? null : window.prompt("Motivo da recusa:") || "Não atende aos requisitos";
    setBusy(id);
    const { data, error } = await supabase.rpc("review_verification", {
      _id: id,
      _approve: approve,
      _reason: reason,
    });
    setBusy(null);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || res?.ok !== true) return toast.error(error?.message ?? res?.error ?? "Falha");
    toast.success(approve ? "Selo concedido" : "Pedido recusado");
    reload();
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Nenhum pedido de selo pendente." />;
  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl glass border border-white/10 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1">{r.full_name}</span>
            <span className="text-[11px] text-muted-foreground">{r.type_key}</span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{r.about}</p>
          {(r.links as string[])?.map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer" className="block text-xs text-primary truncate">
              {l}
            </a>
          ))}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={busy === r.id} onClick={() => act(r.id, true)}>
              {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Aprovar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={busy === r.id} onClick={() => act(r.id, false)}>
              <X className="h-4 w-4 mr-1" /> Recusar
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- Denúncias ---------- */
function ReportsQueue() {
  const { rows, reload } = useList(async () => {
    const { data } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, details, status, created_at")
      .eq("status", "aberto")
      .order("created_at");
    return data ?? [];
  });

  const act = async (id: string, status: "resolvido" | "descartado") => {
    const { data, error } = await supabase.rpc("resolve_report", { _id: id, _status: status });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || res?.ok !== true) return toast.error(error?.message ?? res?.error ?? "Falha");
    toast.success("Denúncia atualizada");
    reload();
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Nenhuma denúncia aberta." />;
  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl glass border border-white/10 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1">{r.reason}</span>
            <span className="text-[11px] text-muted-foreground">{r.target_type}</span>
          </div>
          {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
          <p className="text-[11px] text-muted-foreground break-all">Alvo: {r.target_id}</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => act(r.id, "resolvido")}>
              Resolver
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => act(r.id, "descartado")}>
              Descartar
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- Fila de filmes ---------- */
function MoviesQueue() {
  const { rows, reload } = useList(async () => {
    const { data } = await supabase
      .from("movies")
      .select("id, title, category, year, rights_holder, license_note, status, created_at")
      .neq("status", "publicado")
      .order("created_at");
    return data ?? [];
  });

  const act = async (id: string, approve: boolean) => {
    const { data, error } = await supabase.rpc("review_movie", { _id: id, _approve: approve });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || res?.ok !== true) return toast.error(error?.message ?? res?.error ?? "Falha");
    toast.success(approve ? "Filme publicado" : "Filme rejeitado");
    reload();
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Nenhum filme aguardando revisão." />;
  return (
    <>
      {rows.map((m) => (
        <div key={m.id} className="rounded-xl glass border border-white/10 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1">{m.title}</span>
            <span className="text-[11px] text-muted-foreground">{m.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Direitos: {m.rights_holder ?? "não informado"}
            {m.license_note ? ` · ${m.license_note}` : ""}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => act(m.id, true)}>
              Publicar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => act(m.id, false)}>
              Rejeitar
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- Provedores de IA ---------- */
function AiProviders() {
  const { rows, reload } = useList(async () => {
    const { data } = await supabase
      .from("ai_providers")
      .select("id, name, slug, model, enabled, priority, secret_name, user_daily_limit, global_daily_limit")
      .order("priority");
    return data ?? [];
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const save = async (slug: string, patch: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc("update_ai_provider", { _slug: slug, ...patch });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || res?.ok !== true) return toast.error(error?.message ?? res?.error ?? "Sem permissão");
    toast.success("Provedor atualizado");
    reload();
  };

  if (!rows) return <Loading />;
  return (
    <>
      <p className="text-xs text-muted-foreground">
        A cadeia de IA usa os provedores em ordem de prioridade. A chave de cada provedor fica somente no servidor
        (segredo <span className="font-mono">nome</span> indicado abaixo).
      </p>
      {rows.map((p) => (
        <div key={p.id} className="rounded-xl glass border border-white/10 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1">{p.name}</span>
            <span
              className={`text-[11px] rounded-full px-2 py-0.5 ${
                p.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-muted-foreground"
              }`}
            >
              {p.enabled ? "ativo" : "desligado"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {p.slug} · segredo: {p.secret_name ?? "—"} · prioridade {p.priority}
          </p>
          <div className="flex gap-2">
            <Input
              value={draft[p.slug] ?? p.model}
              onChange={(e) => setDraft((d) => ({ ...d, [p.slug]: e.target.value }))}
              className="h-9 bg-white/5 border-white/10 text-xs font-mono"
            />
            <Button size="sm" onClick={() => save(p.slug, { _model: draft[p.slug] ?? p.model })}>
              Salvar
            </Button>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => save(p.slug, { _enabled: !p.enabled })}>
            {p.enabled ? "Desligar provedor" : "Ligar provedor"}
          </Button>
        </div>
      ))}
    </>
  );
}

/* ---------- Permissões ---------- */
function PermsMatrix() {
  const { rows, reload } = useList(async () => {
    const { data } = await supabase.from("role_permissions").select("role, permission");
    return data ?? [];
  });

  const toggle = async (role: "admin" | "moderator", permission: string, enabled: boolean) => {
    const { data, error } = await supabase.rpc("set_role_permission", {
      _role: role,
      _permission: permission,
      _enabled: enabled,
    });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || res?.ok !== true) return toast.error(error?.message ?? res?.error ?? "Falha");
    reload();
  };

  if (!rows) return <Loading />;
  const has = (role: string, perm: string) => rows.some((r) => r.role === role && r.permission === perm);

  return (
    <div className="space-y-3">
      {(["admin", "moderator"] as const).map((role) => (
        <div key={role} className="rounded-xl glass border border-white/10 p-3 space-y-2">
          <p className="text-sm font-semibold capitalize">{role}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {PERMISSIONS.map((perm) => {
              const on = has(role, perm);
              return (
                <button
                  key={perm}
                  onClick={() => toggle(role, perm, !on)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                    on ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground"
                  }`}
                >
                  <span className="font-mono">{perm}</span>
                  <span>{on ? "permitido" : "bloqueado"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Auditoria ---------- */
function AuditLog() {
  const { rows } = useList(async () => {
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, result, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    return data ?? [];
  });

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Nenhum registro de auditoria (ou sem permissão)." />;
  return (
    <>
      {rows.map((a) => (
        <div key={a.id} className="rounded-lg glass border border-white/10 px-3 py-2 text-xs">
          <div className="flex gap-2">
            <span className="font-mono text-primary">{a.action}</span>
            <span className="flex-1 text-muted-foreground truncate">
              {a.resource_type}:{a.resource_id}
            </span>
            <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
          </div>
        </div>
      ))}
    </>
  );
}
