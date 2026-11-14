import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Bell, BellOff, Lock, MoreVertical, Pin, PinOff, Plus, Search, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { conversationPreview, conversationTime } from "@/lib/chat-appearance";

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
  lastMessageAt: string;
  lastSenderId?: string | null;
  isAi: boolean;
  pinned: boolean;
  archived: boolean;
  mutedUntil: string | null;
};

const isCarlosName = (name: string | null) => name === "Carlos" || name === "Jarvis IA";
const isMuted = (until: string | null) => !!until && new Date(until).getTime() > Date.now();

export function ChatList({ activeId, onSelect, onNewChat }: { activeId: string | null; onSelect: (id: string) => void; onNewChat: () => void }) {
  const { user } = useAuth();
  const { locks, readThrough, markConversationRead } = useSettings();
  const [allItems, setAllItems] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadFailed(false);
    const { data: members, error: membersError } = await supabase
      .from("conversation_members")
      .select("conversation_id, pinned, archived, muted_until")
      .eq("user_id", user.id);
    if (membersError) {
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    const memberRows = members ?? [];
    const conversationIds = memberRows.map((member) => member.conversation_id);
    if (conversationIds.length === 0) {
      setAllItems([]);
      setLoading(false);
      return;
    }
    const metaById = new Map(memberRows.map((member) => [member.conversation_id, member]));
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false });
    if (conversationsError) {
      setLoadFailed(true);
      setLoading(false);
      return;
    }

    const enriched: Enriched[] = await Promise.all((conversations ?? []).map(async (conversation) => {
      const isAi = !conversation.is_group && isCarlosName(conversation.name);
      let displayName = isAi ? "Carlos" : conversation.name ?? "Conversa";
      let avatarUrl = conversation.avatar_url;
      if (!conversation.is_group && !isAi) {
        const { data: otherMembers } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversation.id)
          .neq("user_id", user.id);
        const otherId = otherMembers?.[0]?.user_id;
        if (otherId) {
          const { data: otherProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", otherId)
            .maybeSingle();
          if (otherProfile) {
            displayName = otherProfile.display_name;
            avatarUrl = avatarUrl ?? otherProfile.avatar_url;
          }
        }
      }
      const { data: latest } = await supabase
        .from("messages")
        .select("content, cipher, deleted_at, message_type, sender_id, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = latest?.[0];
      const meta = metaById.get(conversation.id);
      return {
        ...conversation,
        avatar_url: avatarUrl,
        displayName,
        isAi,
        pinned: !!meta?.pinned,
        archived: !!meta?.archived,
        mutedUntil: meta?.muted_until ?? null,
        lastMessage: last ? conversationPreview(last, user.id) : undefined,
        lastMessageAt: last?.created_at ?? conversation.last_message_at,
        lastSenderId: last?.sender_id,
      };
    }));

    enriched.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.isAi !== b.isAi) return a.isAi ? -1 : 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
    setAllItems(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const patchMember = async (conversationId: string, patch: { pinned?: boolean; archived?: boolean; muted_until?: string | null }, message: string) => {
    if (!user) return;
    setAllItems((current) => current.map((conversation) => conversation.id === conversationId ? {
      ...conversation,
      pinned: patch.pinned ?? conversation.pinned,
      archived: patch.archived ?? conversation.archived,
      mutedUntil: patch.muted_until !== undefined ? patch.muted_until : conversation.mutedUntil,
    } : conversation));
    const { error } = await supabase.from("conversation_members").update(patch).eq("conversation_id", conversationId).eq("user_id", user.id);
    if (error) {
      toast.error("Não foi possível atualizar a conversa");
      void load();
      return;
    }
    toast.success(message);
    void load();
  };

  const archivedCount = allItems.filter((conversation) => conversation.archived).length;
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return allItems
      .filter((conversation) => showArchived ? conversation.archived : !conversation.archived)
      .filter((conversation) => !normalizedQuery || `${conversation.displayName} ${conversation.lastMessage ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  }, [allItems, query, showArchived]);

  const selectConversation = (conversation: Enriched) => {
    markConversationRead(conversation.id, conversation.lastMessageAt);
    onSelect(conversation.id);
  };

  return (
    <div className="min-h-full">
      <div className="chat-chrome sticky top-0 z-20 space-y-1 border-b border-border px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar conversas"
            aria-label="Buscar conversas"
            className="h-10 rounded-full border-border bg-secondary/50 pl-9 pr-9"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex h-7 items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">{showArchived ? "Conversas arquivadas" : "Mais recentes"}</span>
          {(archivedCount > 0 || showArchived) && (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onClick={() => setShowArchived((current) => !current)}>
              <Archive className="h-3.5 w-3.5" /> {showArchived ? "Voltar" : `Arquivadas (${archivedCount})`}
            </Button>
          )}
        </div>
      </div>

      {loading ? <ListSkeleton rows={7} /> : loadFailed ? (
        <div className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar suas conversas.</p>
          <Button variant="outline" onClick={() => { setLoading(true); void load(); }}>Tentar novamente</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <MessageCirclePlaceholder />
          <p className="mt-3 text-sm font-medium">{query ? "Nenhum resultado" : showArchived ? "Nenhuma conversa arquivada" : "Comece uma conversa"}</p>
          <p className="mt-1 max-w-64 text-sm text-muted-foreground">
            {query ? "Tente buscar por outro nome ou mensagem." : showArchived ? "As conversas arquivadas aparecem aqui." : "Encontre alguém pelo nome, usuário ou número do Nuv."}
          </p>
          {!query && !showArchived && <Button className="mt-4" onClick={onNewChat}><Plus className="mr-2 h-4 w-4" /> Nova conversa</Button>}
        </div>
      ) : (
        <ul aria-label={showArchived ? "Conversas arquivadas" : "Conversas"}>
          {items.map((conversation) => {
            const locked = !!locks[conversation.id];
            const muted = isMuted(conversation.mutedUntil);
            const unread = !locked && conversation.lastSenderId !== user?.id && conversation.lastMessageAt > (readThrough[conversation.id] ?? "");
            return (
              <li key={conversation.id} className="group relative border-b border-border/60">
                <button
                  type="button"
                  onClick={() => selectConversation(conversation)}
                  aria-current={activeId === conversation.id ? "page" : undefined}
                  className={`chat-list-item flex w-full items-center gap-3 px-4 py-3 pr-12 text-left transition-colors hover:bg-secondary/45 focus-visible:bg-secondary/45 ${activeId === conversation.id ? "bg-secondary/60" : ""}`}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    {conversation.avatar_url && <AvatarImage src={conversation.avatar_url} alt="" />}
                    <AvatarFallback className={conversation.isAi ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"}>
                      {conversation.isAi ? <Sparkles className="h-5 w-5" /> : conversation.is_group ? <Users className="h-5 w-5" /> : conversation.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`flex min-w-0 items-center gap-1.5 truncate ${unread ? "font-semibold" : "font-medium"}`}>
                        <span className="truncate">{conversation.displayName}</span>
                        {conversation.pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Fixada" />}
                        {muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Silenciada" />}
                        {locked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Protegida" />}
                      </span>
                      <span className={`shrink-0 text-[11px] ${unread ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                        {conversationTime(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {locked ? "Conversa protegida com PIN" : conversation.lastMessage ?? "Nenhuma mensagem"}
                      </span>
                      {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Mensagem não lida" />}
                    </span>
                  </span>
                </button>

                {!conversation.isAi && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Opções de ${conversation.displayName}`}>
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => patchMember(conversation.id, { pinned: !conversation.pinned }, conversation.pinned ? "Conversa desafixada" : "Conversa fixada")}>
                        {conversation.pinned ? <><PinOff className="mr-2 h-4 w-4" /> Desafixar</> : <><Pin className="mr-2 h-4 w-4" /> Fixar</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => patchMember(conversation.id, { muted_until: muted ? null : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() }, muted ? "Notificações reativadas" : "Silenciada por 8 horas")}>
                        {muted ? <><Bell className="mr-2 h-4 w-4" /> Reativar som</> : <><BellOff className="mr-2 h-4 w-4" /> Silenciar por 8 horas</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => patchMember(conversation.id, { archived: !conversation.archived }, conversation.archived ? "Conversa restaurada" : "Conversa arquivada")}>
                        {conversation.archived ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Desarquivar</> : <><Archive className="mr-2 h-4 w-4" /> Arquivar</>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MessageCirclePlaceholder() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
      <Plus className="h-6 w-6" />
    </div>
  );
}
