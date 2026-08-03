import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Users, Lock, Pin, PinOff, BellOff, Bell, Archive, ArchiveRestore, MoreVertical } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  pinned: boolean;
  archived: boolean;
  mutedUntil: string | null;
};

const isCarlosName = (n: string | null) => n === "Carlos" || n === "Jarvis IA";
const isMuted = (until: string | null) => !!until && new Date(until).getTime() > Date.now();

export function ChatList({
  activeId,
  onSelect,
  filter = "all",
  showArchived = false,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  filter?: "all" | "direct" | "groups";
  showArchived?: boolean;
}) {
  const { user } = useAuth();
  const { locks } = useSettings();
  const [allItems, setAllItems] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const items = allItems
    .filter((c) => (showArchived ? c.archived : !c.archived))
    .filter((c) => (filter === "all" ? true : filter === "groups" ? c.is_group : !c.is_group));
  const archivedCount = allItems.filter((c) => c.archived).length;

  const load = async () => {
    if (!user) return;
    const { data: members } = await supabase
      .from("conversation_members")
      .select("conversation_id, pinned, archived, muted_until")
      .eq("user_id", user.id);
    const memberRows = members ?? [];
    const convIds = memberRows.map((m) => m.conversation_id);
    if (convIds.length === 0) { setAllItems([]); setLoading(false); return; }
    const metaById = new Map(memberRows.map((m) => [m.conversation_id, m]));

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
        const meta = metaById.get(c.id);
        return {
          ...c,
          displayName,
          isAi,
          pinned: !!meta?.pinned,
          archived: !!meta?.archived,
          mutedUntil: meta?.muted_until ?? null,
          lastMessage: last ? (last.is_ai ? "✨ " : last.sender_id === user.id ? "Você: " : "") + last.content : undefined,
        };
      })
    );
    // Carlos e conversas fixadas sempre no topo
    enriched.sort((a, b) => {
      if (a.isAi !== b.isAi) return a.isAi ? -1 : 1;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
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

  const patchMember = async (convId: string, patch: { pinned?: boolean; archived?: boolean; muted_until?: string | null }, msg: string) => {
    if (!user) return;
    setAllItems((cur) =>
      cur.map((c) =>
        c.id === convId
          ? {
              ...c,
              pinned: patch.pinned ?? c.pinned,
              archived: patch.archived ?? c.archived,
              mutedUntil: patch.muted_until !== undefined ? patch.muted_until : c.mutedUntil,
            }
          : c,
      ),
    );
    const { error } = await supabase
      .from("conversation_members")
      .update(patch)
      .eq("conversation_id", convId)
      .eq("user_id", user.id);
    if (error) { toast.error("Não foi possível atualizar a conversa"); load(); return; }
    toast.success(msg);
    load();
  };

  if (loading) return <ListSkeleton rows={7} />;
  if (items.length === 0)
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        {showArchived ? "Nenhuma conversa arquivada." : (
          <>Nenhuma órbita ainda. Toque em <Users className="inline h-3.5 w-3.5" /> acima para iniciar.</>
        )}
      </div>
    );

  return (
    <>
      {!showArchived && archivedCount > 0 && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-white/5 flex items-center gap-1.5">
          <Archive className="h-3.5 w-3.5" /> {archivedCount} conversa(s) arquivada(s)
        </div>
      )}
      <ul>
        {items.map((c) => {
          const locked = !!locks[c.id];
          const muted = isMuted(c.mutedUntil);
          return (
            <li key={c.id} className="relative group">
              <button
                onClick={() => onSelect(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 pr-11 hover:bg-primary/10 transition-colors border-b border-white/5 text-left ${activeId === c.id ? "bg-primary/15" : ""}`}
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
                      {(c.isAi || c.pinned) && <Pin className="h-3 w-3 text-[var(--nebula)]" />}
                      {c.isAi && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/30 text-[var(--nebula)] font-semibold">IA</span>}
                      {muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
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

              {!c.isAi && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="tap-press absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5"
                      aria-label={`Opções de ${c.displayName}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => patchMember(c.id, { pinned: !c.pinned }, c.pinned ? "Conversa desafixada" : "Conversa fixada")}>
                      {c.pinned ? <><PinOff className="mr-2 h-4 w-4" /> Desafixar</> : <><Pin className="mr-2 h-4 w-4" /> Fixar no topo</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        patchMember(
                          c.id,
                          { muted_until: muted ? null : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() },
                          muted ? "Notificações reativadas" : "Silenciada por 8 horas",
                        )
                      }
                    >
                      {muted ? <><Bell className="mr-2 h-4 w-4" /> Reativar som</> : <><BellOff className="mr-2 h-4 w-4" /> Silenciar 8h</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => patchMember(c.id, { archived: !c.archived }, c.archived ? "Conversa restaurada" : "Conversa arquivada")}>
                      {c.archived ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Desarquivar</> : <><Archive className="mr-2 h-4 w-4" /> Arquivar</>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
