import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sparkles, Send, Phone, Video, MoreVertical, Users, Wand2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  is_ai: boolean;
  to_ai: boolean;
  created_at: string;
};

type ConvHeader = {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  displayName: string;
  subtitle: string;
  isAi: boolean;
};

export function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [header, setHeader] = useState<ConvHeader | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const senderNames = useRef<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation header
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
      if (!c) return;
      const isAi = !c.is_group && c.name === "Jarvis IA";
      let displayName = c.name ?? "Conversa";
      let subtitle = isAi ? "Assistente IA · sempre online" : c.is_group ? "Grupo" : "online";
      if (!c.is_group && !isAi) {
        const { data: others } = await supabase
          .from("conversation_members").select("user_id").eq("conversation_id", conversationId).neq("user_id", user.id);
        const otherId = others?.[0]?.user_id;
        if (otherId) {
          const { data: p } = await supabase.from("profiles").select("display_name, avatar_url, about").eq("id", otherId).maybeSingle();
          if (p) { displayName = p.display_name; subtitle = p.about ?? "online"; c.avatar_url = c.avatar_url ?? p.avatar_url; }
        }
      } else if (c.is_group) {
        const { count } = await supabase.from("conversation_members").select("*", { count: "exact", head: true }).eq("conversation_id", conversationId);
        subtitle = `${count ?? 0} membros`;
      }
      setHeader({ id: c.id, is_group: c.is_group, name: c.name, avatar_url: c.avatar_url, displayName, subtitle, isAi });
    })();
  }, [conversationId, user]);

  // Load messages
  const loadMessages = async () => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    setMessages(data ?? []);
    // resolve sender names for group chats
    const ids = Array.from(new Set((data ?? []).map((m) => m.sender_id).filter((x): x is string => !!x && !senderNames.current[x])));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      profs?.forEach((p) => { senderNames.current[p.id] = p.display_name; });
    }
  };

  useEffect(() => {
    loadMessages();
    const ch = supabase
      .channel(`conv-${conversationId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const m = payload.new as Message;
          if (m.sender_id && !senderNames.current[m.sender_id]) {
            const { data: p } = await supabase.from("profiles").select("display_name").eq("id", m.sender_id).maybeSingle();
            if (p) senderNames.current[m.sender_id] = p.display_name;
          }
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.is_ai) setAiThinking(false);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, aiThinking]);

  const callAI = async (mode: "reply" | "suggest", userMessage?: string) => {
    const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/jarvis-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ conversationId, mode, userMessage }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Falha na IA");
    }
    return res.json();
  };

  const send = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setText(""); setSuggestions([]);
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      to_ai: header?.isAi ?? false,
    });
    setSending(false);
    if (error) { toast.error(error.message); setText(content); return; }
    if (header?.isAi) {
      setAiThinking(true);
      try { await callAI("reply", content); }
      catch (e) { setAiThinking(false); toast.error((e as Error).message); }
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const r = await callAI("suggest");
      setSuggestions(r.suggestions ?? []);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSuggesting(false); }
  };

  if (!header) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-2 sm:px-4 flex items-center gap-3 border-b bg-primary text-primary-foreground">
        <Button size="icon" variant="ghost" className="h-9 w-9 md:hidden hover:bg-primary-foreground/15" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
          {header.avatar_url && <AvatarImage src={header.avatar_url} />}
          <AvatarFallback className={header.isAi ? "bg-accent text-accent-foreground" : "bg-primary-foreground/20"}>
            {header.isAi ? <Sparkles className="h-4 w-4" /> : header.is_group ? <Users className="h-4 w-4" /> : header.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-1.5">
            {header.displayName}
            {header.isAi && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/30 font-semibold">IA</span>}
          </div>
          <div className="text-xs opacity-80 truncate">{aiThinking ? "digitando..." : header.subtitle}</div>
        </div>
        <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-primary-foreground/15" onClick={() => toast.info("Chamadas em breve no CatroGo")}>
          <Video className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-primary-foreground/15" onClick={() => toast.info("Chamadas em breve no CatroGo")}>
          <Phone className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-primary-foreground/15"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info("Em breve")}>Limpar conversa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-bg p-4 space-y-2">
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const prev = messages[i - 1];
          const showSender = header.is_group && !mine && !m.is_ai && (!prev || prev.sender_id !== m.sender_id);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                m.is_ai ? "bg-accent/30 border border-accent/40" :
                mine ? "bg-[var(--color-bubble-out)] text-foreground rounded-tr-sm" :
                "bg-[var(--color-bubble-in)] text-foreground rounded-tl-sm"
              }`}>
                {m.is_ai && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-accent-foreground/80 mb-0.5">
                    <Sparkles className="h-3 w-3" /> Jarvis
                  </div>
                )}
                {showSender && m.sender_id && (
                  <div className="text-xs font-semibold text-primary mb-0.5">{senderNames.current[m.sender_id] ?? "..."}</div>
                )}
                <div className="whitespace-pre-wrap break-words text-[15px]">{m.content}</div>
                <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                  {format(new Date(m.created_at), "HH:mm")}
                </div>
              </div>
            </div>
          );
        })}
        {aiThinking && (
          <div className="flex justify-start">
            <div className="bg-accent/30 border border-accent/40 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-3 py-2 border-t bg-card flex gap-2 overflow-x-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { setText(s); setSuggestions([]); }}
              className="flex-shrink-0 text-sm px-3 py-1.5 rounded-full bg-accent/20 hover:bg-accent/30 border border-accent/30 transition-colors">
              <Sparkles className="h-3 w-3 inline mr-1 text-accent" />{s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="p-2 sm:p-3 border-t bg-card flex items-center gap-2">
        {!header.isAi && (
          <Button size="icon" variant="ghost" onClick={suggest} disabled={suggesting} title="Sugerir respostas com IA">
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-accent" />}
          </Button>
        )}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={header.isAi ? "Pergunte algo ao Jarvis..." : "Digite uma mensagem"}
          className="flex-1 rounded-full bg-muted/50"
        />
        <Button size="icon" onClick={send} disabled={sending || !text.trim()} className="rounded-full bg-primary">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
