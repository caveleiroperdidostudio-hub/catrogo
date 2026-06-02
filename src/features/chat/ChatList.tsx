import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Users, Lock, Pin } from "lucide-react";
import { formatRelative } from "date-fns";
import { ptBR } from "date-fns/locale";

type ConvRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  last_message_at: string;
  created_by: string | null;
};

type Enriched = ConvRow & {
  displayName: string;
  lastMessage?: string;
  isAi: boolean;
};

const isCarlosName = (n: string | null) => n === "Carlos" || n === "Jarvis IA";

export function ChatList({ activeId, onSelect, filter = "all" }: { activeId: string | null; onSelect: (id: string) => void; filter?: "all" | "direct" | "groups" }) {
  const { user } = useAuth();
  const { locks } = useSettings();
  const [allItems, setAllItems] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const items = allItems.filter((c) =>
    filter === "all" ? true : filter === "groups" ? c.is_group : !c.is_group
  );

  const load = async () => {
    if (!user) return;
    const { data: members } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);
    const convIds = (members ?? []).map((m) => m.conversation_id);
    if (convIds.length === 0) { setAllItems([]); setLoading(false); return; }

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });

    const enriched: Enriched[] = await Promise.all(
      (convs ?? []).map(async (c) => {
        const isAi = !c.is_group && isCarlosName(c.name);
        let displayName = isAi ? "Carlos" : (c.name ?? "Conversa");
        if (!c.is_group && !isAi) {
          const { data: otherMembers } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", c.id)
            .neq("user_id", user.id);
          const otherId = otherMembers?.[0]?.user_id;
          if (otherId) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", otherId)
              .maybeSingle();
            if (prof) {
              displayName = prof.display_name;
              c.avatar_url = c.avatar_url ?? prof.avatar_url;
            }
          }
        }
        const { data: msgs } = await supabase
          .from("messages")
          .select("content, is_ai, sender_id")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const last = msgs?.[0];
        return {
          ...c,
          displayName,
          isAi,
          lastMessage: last ? (last.is_ai ? "✨ " : last.sender_id === user.id ? "Você: " : "") + last.content : undefined,
        };
      })
    );
    // Carlos sempre fixado no topo
    enriched.sort((a, b) => {
      if (a.isAi && !b.isAi) return -1;
      if (!a.isAi && b.isAi) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
    setAllItems(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Calibrando órbitas…</div>;
  if (items.length === 0) return <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma órbita ainda. Toque em <Users className="inline h-3.5 w-3.5" /> acima para iniciar.</div>;

  return (
    <ul>
      {items.map((c) => {
        const locked = !!locks[c.id];
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-primary/10 transition-colors border-b border-white/5 text-left ${activeId === c.id ? "bg-primary/15" : ""}`}
            >
              <Avatar className={`h-12 w-12 ${c.isAi ? "carlos-avatar" : ""}`}>
                {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                <AvatarFallback className={c.isAi ? "bg-primary/30 text-[var(--nebula)] border border-primary/40" : "bg-secondary text-foreground"}>
                  {c.isAi ? <Sparkles className="h-5 w-5" /> : c.is_group ? <Users className="h-5 w-5" /> : c.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-medium truncate flex items-center gap-1.5">
                    {c.displayName}
                    {c.isAi && <Pin className="h-3 w-3 text-[var(--nebula)]" />}
                    {c.isAi && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/30 text-[var(--nebula)] font-semibold">IA</span>}
                    {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {formatRelative(new Date(c.last_message_at), new Date(), { locale: ptBR }).split(" às")[0]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {locked ? "🔒 Chat protegido com PIN" : (c.lastMessage ?? "—")}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
