import { useEffect, useState } from "react";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRelative } from "date-fns";
import { ptBR } from "date-fns/locale";

type Row = {
  id: string;
  caller_id: string;
  callee_id: string;
  mode: string;
  status: string;
  duration_seconds: number;
  created_at: string;
};

type Item = Row & { name: string; avatar: string | null; outgoing: boolean };

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function CallsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("call_logs")
        .select("id, caller_id, callee_id, mode, status, duration_seconds, created_at")
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(60);
      const rows = (data ?? []) as Row[];
      const peerIds = Array.from(
        new Set(rows.map((r) => (r.caller_id === user.id ? r.callee_id : r.caller_id))),
      );
      const map = new Map<string, { display_name: string; avatar_url: string | null }>();
      if (peerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", peerIds);
        (profs ?? []).forEach((p) => map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }));
      }
      if (!alive) return;
      setItems(
        rows.map((r) => {
          const outgoing = r.caller_id === user.id;
          const peer = map.get(outgoing ? r.callee_id : r.caller_id);
          return {
            ...r,
            outgoing,
            name: peer?.display_name ?? "Usuário",
            avatar: peer?.avatar_url ?? null,
          };
        }),
      );
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("calls-tab")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  if (loading) return <ListSkeleton rows={6} />;

  if (items.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          icon={Phone}
          title="Nenhum sinal ainda"
          description="Suas chamadas de voz e vídeo aparecerão aqui com horário e duração."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {items.map((c) => {
        const failed = c.status === "missed" || c.status === "rejected" || c.status === "canceled";
        const Icon = failed ? PhoneMissed : c.outgoing ? PhoneOutgoing : PhoneIncoming;
        return (
          <li key={c.id} className="flex items-center gap-3 px-3 py-3">
            <Avatar className="h-11 w-11">
              {c.avatar && <AvatarImage src={c.avatar} />}
              <AvatarFallback className="bg-secondary">{c.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className={`mt-0.5 flex items-center gap-1.5 text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" />
                {formatRelative(new Date(c.created_at), new Date(), { locale: ptBR })}
                {c.status === "answered" && c.duration_seconds > 0 && ` • ${fmtDuration(c.duration_seconds)}`}
                {c.status === "rejected" && " • recusada"}
                {c.status === "missed" && " • sem resposta"}
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              {c.mode === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
