import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { conversationTime, type ChatAppearance } from "@/lib/chat-appearance";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Lock, Pin, PinOff, BellOff, Bell, Archive, ArchiveRestore, MoreVertical, MessageSquarePlus } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  listDensity = "comfortable",
  onNewChat,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  filter?: "all" | "direct" | "groups";
  showArchived?: boolean;
  listDensity?: ChatAppearance["list"];
  onNewChat?: () => void;
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
    if (!user) { setLoading(false); return; }
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
      <EmptyState
        icon={showArchived ? Archive : MessageSquarePlus}
        title={showArchived ? "Nada arquivado" : "Nenhuma conversa ainda"}
        description={
          showArchived
            ? "As conversas que você arquivar aparecem aqui."
            : "Comece uma conversa com alguém ou fale com o Carlos, o assistente do Nuv."
        }
        action={
          !showArchived && onNewChat ? (
            <Button size="sm" onClick={onNewChat} className="gap-1.5">
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /> Nova conversa
            </Button>
          ) : undefined
        }
      />
    );

  return (
    <>
      {!showArchived && archivedCount > 0 && (
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          <Archive className="h-3.5 w-3.5" aria-hidden="true" /> {archivedCount} conversa{archivedCount > 1 ? "s" : ""} arquivada{archivedCount > 1 ? "s" : ""}
        </div>
      )}
      <ul data-chat-list={listDensity}>
        {items.map((c) => {
          const locked = !!locks[c.id];
          const muted = isMuted(c.mutedUntil);
          return (
            <li key={c.id} className="group relative">
              <button
                onClick={() => onSelect(c.id)}
                aria-current={activeId === c.id ? "true" : undefined}
                className={cn(
                  "chat-row flex w-full items-center gap-3 border-b border-border/60 pl-3 pr-12 text-left transition-colors",
                  "hover:bg-secondary/70 focus-visible:bg-secondary/70",
                  activeId === c.id && "bg-secondary",
                )}
              >
                <Avatar className="h-12 w-12 shrink-0">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}
                  <AvatarFallback className={c.isAi ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"}>
                    {c.isAi ? <Sparkles className="h-5 w-5" aria-hidden="true" /> : c.is_group ? <Users className="h-5 w-5" aria-hidden="true" /> : c.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[15px] font-medium text-foreground">{c.displayName}</span>
                      {c.isAi && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">IA</span>
                      )}
                      {c.pinned && !c.isAi && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Fixada" />}
                      {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Silenciada" />}
                      {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Protegida por PIN" />}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {conversationTime(c.last_message_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    {locked ? "Chat protegido com PIN" : (c.lastMessage ?? "Sem mensagens ainda")}
                  </p>
                </div>
              </button>

              {!c.isAi && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary"
                      aria-label={`Opções de ${c.displayName}`}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
