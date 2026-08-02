import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSettings, verifyPin, TICK_GLYPHS } from "@/lib/settings-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Sparkles, Send, Phone, Video, MoreVertical, Users, Wand2, Loader2,
  Languages, BrainCircuit, Timer, Lock, OrbitIcon, ShieldHalf, ShieldCheck, MailOpen, Mic, Image as ImageIcon,
  Reply, Pencil, Trash2, Star, Forward, Search, Copy, SmilePlus, X, Clock, CheckCheck,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { CallScreen, type CallMode } from "./CallScreen";
import { VoiceRecorder, AudioBubble, uploadAudio, type RecordingHandle } from "./VoiceRecorder";
import { sendCallInvite } from "./IncomingCallListener";
import { notifyNewMessage } from "@/lib/notify.functions";
import { notifyConversation } from "@/lib/notify-inapp";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍", "🚀"];

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  is_ai: boolean;
  to_ai: boolean;
  created_at: string;
  reply_to?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

type Reaction = { message_id: string; user_id: string; emoji: string };


type ConvHeader = {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  displayName: string;
  subtitle: string;
  isAi: boolean;
  otherUserId: string | null;
};

const EPHEMERAL_OPTIONS: { label: string; seconds: number }[] = [
  { label: "Desativado", seconds: 0 },
  { label: "5 minutos", seconds: 5 * 60 },
  { label: "1 hora", seconds: 60 * 60 },
  { label: "24 horas", seconds: 24 * 60 * 60 },
];

const TRANSLATE_TARGETS = ["inglês", "espanhol", "francês", "alemão", "japonês", "italiano"];

const isCarlosName = (n: string | null) => n === "Carlos" || n === "Jarvis IA";

export function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const {
    privacy, ephemeral, setEphemeral, locks, lockChat, unlockChat, isUnlockedNow, markUnlockedNow,
    chatWallpaper: globalWallpaper, appearance, contactWallpapers, setContactWallpaper,
  } = useSettings();
  const chatWallpaper = contactWallpapers[conversationId] ?? globalWallpaper;
  const [call, setCall] = useState<null | { mode: CallMode; sessionId: string; isCaller: boolean }>(null);
  const [recording, setRecording] = useState(false);
  const recHandleRef = useRef<RecordingHandle | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [unreadMarks, setUnreadMarks] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [header, setHeader] = useState<ConvHeader | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Novos recursos de mensagem
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [starredOpen, setStarredOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [forwardTargets, setForwardTargets] = useState<{ id: string; label: string }[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");


  const senderNames = useRef<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // PIN gate
  const isLocked = !!locks[conversationId];
  const unlocked = isUnlockedNow(conversationId);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [setPinDialogOpen, setSetPinDialogOpen] = useState(false);
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    if (isLocked && !unlocked) setPinOpen(true);
    else setPinOpen(false);
  }, [conversationId, isLocked, unlocked]);

  // tick global de 1s para timers efêmeros
  useEffect(() => {
    const ephemeralOn = ephemeral[conversationId];
    if (!ephemeralOn) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ephemeral, conversationId]);

  // header
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
      if (!c) return;
      const isAi = !c.is_group && isCarlosName(c.name);
      let displayName = isAi ? "Carlos" : (c.name ?? "Conversa");
      let subtitle = isAi ? "IA Carlos · sempre orbitando" : c.is_group ? "Grupo" : "online";
      let otherUserId: string | null = null;
      if (!c.is_group && !isAi) {
        const { data: others } = await supabase
          .from("conversation_members").select("user_id").eq("conversation_id", conversationId).neq("user_id", user.id);
        otherUserId = others?.[0]?.user_id ?? null;
        if (otherUserId) {
          const { data: p } = await supabase.from("profiles").select("display_name, avatar_url, about").eq("id", otherUserId).maybeSingle();
          if (p) { displayName = p.display_name; subtitle = p.about ?? "online"; c.avatar_url = c.avatar_url ?? p.avatar_url; }
        }
      } else if (c.is_group) {
        const { count } = await supabase.from("conversation_members").select("*", { count: "exact", head: true }).eq("conversation_id", conversationId);
        subtitle = `${count ?? 0} membros`;
      }
      if (privacy.ghostOnline && subtitle === "online") subtitle = "—";
      setHeader({ id: c.id, is_group: c.is_group, name: c.name, avatar_url: c.avatar_url, displayName, subtitle, isAi, otherUserId });
    })();
  }, [conversationId, user, privacy.ghostOnline]);

  // mensagens
  const loadMessages = async (): Promise<string[]> => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    setMessages(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((m) => m.sender_id).filter((x): x is string => !!x && !senderNames.current[x])));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      profs?.forEach((p) => { senderNames.current[p.id] = p.display_name; });
    }
    return (data ?? []).map((m) => m.id);
  };

  const loadReactions = async (ids?: string[]) => {
    const messageIds = ids ?? messages.map((m) => m.id);

    if (messageIds.length === 0) { setReactions([]); return; }
    const { data } = await supabase
      .from("message_reactions").select("message_id, user_id, emoji")
      .in("message_id", messageIds);
    setReactions((data ?? []) as Reaction[]);
  };

  const loadStarred = async () => {
    if (!user) return;
    const { data } = await supabase.from("starred_messages").select("message_id").eq("user_id", user.id);
    setStarredIds((data ?? []).map((r: { message_id: string }) => r.message_id));
  };

  useEffect(() => {
    (async () => {
      const ids = await loadMessages();
      await loadReactions(ids);
    })();
    loadStarred();
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
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => { loadReactions(); })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user]);

  // filtro efêmero (visual) + busca dentro da conversa
  const ephemeralSeconds = ephemeral[conversationId] ?? 0;
  const visibleMessages = useMemo(() => {
    let list = messages;
    if (ephemeralSeconds) list = list.filter((m) => (now - new Date(m.created_at).getTime()) < ephemeralSeconds * 1000);
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((m) => m.content.toLowerCase().includes(q));
    return list;
  }, [messages, ephemeralSeconds, now, searchQuery]);

  const messageById = useMemo(() => {
    const map: Record<string, Message> = {};
    messages.forEach((m) => { map[m.id] = m; });
    return map;
  }, [messages]);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages, aiThinking]);

  const callAI = async (body: Record<string, unknown>) => {
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/jarvis-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text() || "Falha na IA");
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
      reply_to: replyTo?.id ?? null,
    });
    setReplyTo(null);

    setSending(false);
    if (error) { toast.error(error.message); setText(content); return; }
    if (!header?.isAi) {
      notifyNewMessage({ data: { conversationId, preview: content.slice(0, 180) } }).catch(() => {});
      notifyConversation(conversationId, content.slice(0, 140)).catch(() => {});
    }

    const mentionsCarlos = /(^|\s)@carlos\b/i.test(content);

    if (header?.isAi) {
      setAiThinking(true);
      try { await callAI({ conversationId, mode: "reply", userMessage: content }); }
      catch (e) { setAiThinking(false); toast.error((e as Error).message); }
    } else if (mentionsCarlos) {
      setAiThinking(true);
      try { await callAI({ conversationId, mode: "mention", userMessage: content }); }
      catch (e) { setAiThinking(false); toast.error((e as Error).message); }
    }
  };

  const stopAndSendAudio = async () => {
    if (!user || !recHandleRef.current) { setRecording(false); return; }
    setUploadingAudio(true);
    const result = await recHandleRef.current.stop().catch(() => null);
    recHandleRef.current = null;
    setRecording(false);
    if (!result) { setUploadingAudio(false); return; }
    try {
      const url = await uploadAudio(user.id, result.blob);
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `[audio:${result.seconds}|${url}]`,
        message_type: "audio",
        to_ai: false,
      });
      if (error) toast.error(error.message);
      else {
        notifyNewMessage({ data: { conversationId, preview: `🎤 Áudio (${result.seconds}s)` } }).catch(() => {});
        notifyConversation(conversationId, `🎤 Áudio (${result.seconds}s)`).catch(() => {});
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Falha ao enviar áudio");
    } finally {
      setUploadingAudio(false);
    }
  };

  const cancelAudio = () => {
    recHandleRef.current?.cancel();
    recHandleRef.current = null;
    setRecording(false);
  };

  const startCall = async (mode: CallMode) => {
    if (!user || !header) return;
    if (!header.otherUserId || header.is_group || header.isAi) {
      toast.info("Chamadas só funcionam em conversas 1-a-1 por enquanto.");
      return;
    }
    try {
      const sessionId = await sendCallInvite({
        peerUserId: header.otherUserId,
        fromUserId: user.id,
        fromName: header.displayName,
        fromAvatar: header.avatar_url,
        conversationId,
        mode,
      });
      setCall({ mode, sessionId, isCaller: true });
    } catch (e) {
      toast.error((e as Error).message ?? "Falha ao iniciar chamada");
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    try { const r = await callAI({ conversationId, mode: "suggest" }); setSuggestions(r.suggestions ?? []); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSuggesting(false); }
  };

  const summarize = async () => {
    setSummarizing(true);
    try { const r = await callAI({ conversationId, mode: "summarize" }); setSummary(r.summary ?? "(sem resumo)"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSummarizing(false); }
  };

  const translate = async (m: Message, lang: string) => {
    setTranslatingId(m.id);
    try {
      const r = await callAI({ mode: "translate", text: m.content, targetLang: lang });
      setTranslations((t) => ({ ...t, [m.id]: `${r.translation}  ·  (${lang})` }));
    } catch (e) { toast.error((e as Error).message); }
    finally { setTranslatingId(null); }
  };


  // --- Ações de mensagem (responder, editar, apagar, reagir, favoritar, copiar)
  const react = async (m: Message, emoji: string) => {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === m.id && r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      await supabase.from("message_reactions").delete().eq("message_id", m.id).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions").insert({ message_id: m.id, user_id: user.id, emoji });
    }
    loadReactions();
  };

  const toggleStar = async (m: Message) => {
    if (!user) return;
    if (starredIds.includes(m.id)) {
      await supabase.from("starred_messages").delete().eq("message_id", m.id).eq("user_id", user.id);
      setStarredIds((s) => s.filter((x) => x !== m.id));
    } else {
      await supabase.from("starred_messages").insert({ message_id: m.id, user_id: user.id });
      setStarredIds((s) => [...s, m.id]);
      toast.success("Mensagem favoritada");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const content = editText.trim();
    if (!content) return;
    const { error } = await supabase.from("messages")
      .update({ content, edited_at: new Date().toISOString() }).eq("id", editing.id);
    if (error) toast.error(error.message);
    else toast.success("Mensagem editada");
    setEditing(null);
  };

  const deleteForEveryone = async (m: Message) => {
    const { error } = await supabase.from("messages")
      .update({ deleted_at: new Date().toISOString(), content: "" }).eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success("Mensagem apagada para todos");
  };

  const openForward = async (m: Message) => {
    if (!user) return;
    setForwarding(m);
    const { data: mem } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
    const ids = (mem ?? []).map((x: { conversation_id: string }) => x.conversation_id).filter((id) => id !== conversationId);
    if (ids.length === 0) { setForwardTargets([]); return; }
    const { data: convs } = await supabase.from("conversations").select("id, name, is_group").in("id", ids);
    setForwardTargets((convs ?? []).map((c: { id: string; name: string | null; is_group: boolean }) => ({
      id: c.id, label: c.name ?? (c.is_group ? "Grupo" : "Conversa"),
    })));
  };

  const doForward = async (targetId: string) => {
    if (!forwarding || !user) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: targetId,
      sender_id: user.id,
      content: `↪️ ${forwarding.content}`,
      to_ai: false,
    });
    if (error) toast.error(error.message);
    else toast.success("Mensagem encaminhada");
    setForwarding(null);
  };

  const scheduleMessage = async () => {
    if (!user || !scheduleAt || !text.trim()) { toast.info("Escreva a mensagem e escolha a data"); return; }
    const { error } = await supabase.from("scheduled_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      content: text.trim(),
      send_at: new Date(scheduleAt).toISOString(),
    });
    if (error) toast.error(error.message);
    else { toast.success("Mensagem agendada"); setText(""); setScheduleOpen(false); }
  };

  // PIN

  const tryUnlock = () => {
    const ok = verifyPin(locks[conversationId] ?? "", pinValue);
    if (!ok) { toast.error("PIN incorreto"); return; }
    markUnlockedNow(conversationId);
    setPinValue("");
    setPinOpen(false);
  };

  if (!header) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--cosmic)]" /></div>;

  // Bloqueio total quando travado
  if (isLocked && !unlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
        <Lock className="h-12 w-12 text-[var(--cosmic)]" />
        <h3 className="font-semibold text-lg">Chat protegido</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Esta órbita está bloqueada com PIN. Insira o código para revelar a conversa.</p>
        <Button onClick={() => setPinOpen(true)} className="cosmic-glow">Inserir PIN</Button>
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <PinDialog open={pinOpen} setOpen={setPinOpen} pinValue={pinValue} setPinValue={setPinValue} onSubmit={tryUnlock} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-2 sm:px-4 flex items-center gap-3 border-b border-white/5 glass">
        <Button size="icon" variant="ghost" className="h-9 w-9 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {!appearance.hideAvatar && (
          <Avatar className={`h-9 w-9 ${header.isAi ? "carlos-avatar" : ""}`}>
            {header.avatar_url && <AvatarImage src={header.avatar_url} />}
            <AvatarFallback className={header.isAi ? "bg-primary/30 text-[var(--nebula)] border border-primary/40" : "bg-secondary"}>
              {header.isAi ? <Sparkles className="h-4 w-4" /> : header.is_group ? <Users className="h-4 w-4" /> : header.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-1.5">
            {appearance.hideName && !header.isAi ? "•••" : header.displayName}
            {header.isAi && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/30 text-[var(--nebula)] font-semibold">IA</span>}
            {ephemeralSeconds > 0 && <Timer className="h-3.5 w-3.5 text-[var(--nebula)]" />}
            {privacy.antiDelete && <OrbitIcon className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <div className="text-xs opacity-80 truncate">
            {aiThinking ? "Carlos está pensando…" : header.subtitle}
          </div>
        </div>

        {/* Resumo (Carlos) */}
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={summarize} disabled={summarizing} title="Resumir conversa com Carlos">
          {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4 text-[var(--nebula)]" />}
        </Button>

        {!appearance.hideCallButton && (
          <>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => startCall("voice")} title="Chamada de voz">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => startCall("video")} title="Chamada de vídeo">
              <Video className="h-4 w-4" />
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Chat efêmero</DropdownMenuLabel>
            {EPHEMERAL_OPTIONS.map((o) => (
              <DropdownMenuItem key={o.seconds} onClick={() => { setEphemeral(conversationId, o.seconds); toast.success(`Modo efêmero: ${o.label}`); }}>
                <Timer className="mr-2 h-4 w-4" /> {o.label}
                {ephemeralSeconds === o.seconds && <span className="ml-auto text-[var(--nebula)]">●</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Privacidade do chat</DropdownMenuLabel>
            {!isLocked ? (
              <DropdownMenuItem onClick={() => { setNewPin(""); setSetPinDialogOpen(true); }}>
                <Lock className="mr-2 h-4 w-4" /> Ocultar chat com PIN
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => { unlockChat(conversationId); toast.success("PIN removido"); }}>
                <ShieldHalf className="mr-2 h-4 w-4" /> Remover PIN
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Fundo desta conversa</DropdownMenuLabel>
            {header.avatar_url && (
              <DropdownMenuItem onClick={() => { setContactWallpaper(conversationId, { type: "image", value: header.avatar_url!, volume: 0, soundEnabled: false }); toast.success("Foto do contato aplicada como fundo"); }}>
                <ImageIcon className="mr-2 h-4 w-4" /> Usar foto do contato
              </DropdownMenuItem>
            )}
            {contactWallpapers[conversationId] && (
              <DropdownMenuItem onClick={() => { setContactWallpaper(conversationId, null); toast.success("Fundo restaurado ao padrão"); }}>
                <OrbitIcon className="mr-2 h-4 w-4" /> Restaurar fundo padrão
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Resumo do Carlos */}
      {summary && (
        <div className="px-3 py-2 border-b border-white/5 glass">
          <div className="flex items-start gap-2">
            <BrainCircuit className="h-4 w-4 mt-0.5 text-[var(--nebula)] flex-shrink-0" />
            <div className="text-sm whitespace-pre-wrap flex-1">{summary}</div>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSummary(null)}>fechar</button>
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div ref={scrollRef} className={`relative flex-1 overflow-y-auto p-4 space-y-2 ${chatWallpaper.type === "gradient" && chatWallpaper.value === "stars" ? "chat-bg" : ""}`}
        style={chatWallpaper.type === "gradient" && chatWallpaper.value !== "stars" ? { background: chatWallpaper.value } : undefined}>
        {chatWallpaper.type === "image" && (
          <div className="pointer-events-none absolute inset-0 -z-0">
            <img src={chatWallpaper.value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
          </div>
        )}
        {chatWallpaper.type === "video" && (
          <div className="pointer-events-none absolute inset-0 -z-0">
            <video
              src={chatWallpaper.value}
              autoPlay loop playsInline
              muted={!chatWallpaper.soundEnabled}
              ref={(el) => { if (el) el.volume = chatWallpaper.volume / 100; }}
              className="h-full w-full object-cover pointer-events-auto"
            />
            <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />
          </div>
        )}
        <div className="relative z-10 space-y-2">
        {visibleMessages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const prev = visibleMessages[i - 1];
          const showSender = header.is_group && !mine && !m.is_ai && (!prev || prev.sender_id !== m.sender_id);
          const remaining = ephemeralSeconds > 0
            ? Math.max(0, ephemeralSeconds - Math.floor((now - new Date(m.created_at).getTime()) / 1000))
            : null;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`chat-bubble max-w-[78%] rounded-2xl px-3 py-2 shadow-sm group ${
                m.is_ai ? "holo rounded-tl-sm" :
                mine ? "bg-[var(--bubble-out)] text-foreground rounded-tr-sm border border-white/10" :
                "bg-[var(--bubble-in)] text-foreground rounded-tl-sm border border-white/10"
              }`}>
                {m.is_ai && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-[var(--nebula)] mb-0.5">
                    <Sparkles className="h-3 w-3" /> Carlos
                  </div>
                )}
                {showSender && m.sender_id && (
                  <div className="text-xs font-semibold text-[var(--cosmic)] mb-0.5">{senderNames.current[m.sender_id] ?? "..."}</div>
                )}
                {m.reply_to && messageById[m.reply_to] && (
                  <div className="mb-1 border-l-2 border-[var(--nebula)] pl-2 text-[12px] text-muted-foreground line-clamp-2">
                    {messageById[m.reply_to].content || "mensagem apagada"}
                  </div>
                )}
                {(() => {
                  if (m.deleted_at) return <div className="italic text-[13px] text-muted-foreground">🚫 Mensagem apagada</div>;
                  const am = /^\[audio:(\d+)(?:\|(.+))?\]$/.exec(m.content);
                  if (am) return <AudioBubble duration={parseInt(am[1], 10)} url={am[2]} />;
                  return (
                    <div className="whitespace-pre-wrap break-words text-[15px]">
                      {m.content}
                      {m.edited_at && <span className="ml-1 text-[10px] text-muted-foreground">(editada)</span>}
                    </div>
                  );
                })()}
                {(() => {
                  const mine2 = reactions.filter((r) => r.message_id === m.id);
                  if (mine2.length === 0) return null;
                  const counts: Record<string, number> = {};
                  mine2.forEach((r) => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1; });
                  return (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {Object.entries(counts).map(([e, n]) => (
                        <button key={e} onClick={() => react(m, e)}
                          className="text-[11px] px-1.5 py-0.5 rounded-full bg-secondary/60 border border-white/10">
                          {e} {n > 1 ? n : ""}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {starredIds.includes(m.id) && <Star className="h-3 w-3 text-yellow-400 mt-1" />}

                {unreadMarks[m.id] && (
                  <div className="text-[10px] mt-0.5 inline-flex items-center gap-1 text-[var(--nebula)]">
                    <MailOpen className="h-3 w-3" /> Marcada como não lida
                  </div>
                )}
                {translations[m.id] && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[13px] text-muted-foreground whitespace-pre-wrap flex items-start gap-1.5">
                    <Languages className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{translations[m.id]}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 mt-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{format(new Date(m.created_at), "HH:mm")}</span>
                    {mine && !m.is_ai && (
                      <span className="text-[var(--nebula)]" title="Entregue">{TICK_GLYPHS[appearance.tickStyle]}</span>
                    )}
                    {remaining !== null && (
                      <span className="inline-flex items-center gap-0.5 text-[var(--nebula)]">
                        <Timer className="h-2.5 w-2.5" />{formatRemaining(remaining)}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-[10px] text-muted-foreground hover:text-[var(--nebula)] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                        {translatingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Languages className="mr-2 h-4 w-4" /> Traduzir mensagem
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {TRANSLATE_TARGETS.map((l) => (
                            <DropdownMenuItem key={l} onClick={() => translate(m, l)}>{l}</DropdownMenuItem>
                          ))}
                          {translations[m.id] && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setTranslations((t) => { const n = { ...t }; delete n[m.id]; return n; })}>
                                Remover tradução
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <div className="flex gap-1 px-2 py-1.5">
                        {QUICK_REACTIONS.map((e) => (
                          <button key={e} className="text-lg leading-none hover:scale-125 transition-transform" onClick={() => react(m, e)}>{e}</button>
                        ))}
                      </div>
                      <DropdownMenuItem onClick={() => setReplyTo(m)}>
                        <Reply className="mr-2 h-4 w-4" /> Responder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openForward(m)}>
                        <Forward className="mr-2 h-4 w-4" /> Encaminhar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(m.content).catch(() => {}); toast.success("Copiada"); }}>
                        <Copy className="mr-2 h-4 w-4" /> Copiar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStar(m)}>
                        <Star className={`mr-2 h-4 w-4 ${starredIds.includes(m.id) ? "text-yellow-400" : ""}`} /> {starredIds.includes(m.id) ? "Remover dos favoritos" : "Favoritar"}
                      </DropdownMenuItem>
                      {mine && !m.is_ai && !m.deleted_at && (
                        <>
                          <DropdownMenuItem onClick={() => { setEditing(m); setEditText(m.content); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400" onClick={() => deleteForEveryone(m)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Apagar para todos
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => setUnreadMarks((u) => ({ ...u, [m.id]: !u[m.id] }))}>
                        <MailOpen className="mr-2 h-4 w-4" /> {unreadMarks[m.id] ? "Desmarcar não lida" : "Marcar como não lida"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("🔒 Mensagem com criptografia ponta-a-ponta (E2EE simulada · Cosmos Lattice)", { description: `ID #${m.id.slice(0, 8)} · ${format(new Date(m.created_at), "dd/MM HH:mm")}` })}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Ver informações de criptografia
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}
        {aiThinking && (
          <div className="flex justify-start">
            <div className="holo rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-[var(--nebula)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 bg-[var(--nebula)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-[var(--nebula)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5 glass flex gap-2 overflow-x-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { setText(s); setSuggestions([]); }}
              className="flex-shrink-0 text-sm px-3 py-1.5 rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/30 transition-colors">
              <Sparkles className="h-3 w-3 inline mr-1 text-[var(--nebula)]" />{s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="p-2 sm:p-3 border-t border-white/5 glass flex items-center gap-2">
        {recording ? (
          <>
            <VoiceRecorder
              onCancel={cancelAudio}
              onReady={(h) => { recHandleRef.current = h; }}
            />
            <Button size="icon" onClick={stopAndSendAudio} disabled={uploadingAudio} className="rounded-full cosmic-glow" title="Enviar áudio">
              {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </>
        ) : (
          <>
            {!header.isAi && (
              <Button size="icon" variant="ghost" onClick={suggest} disabled={suggesting} title="Sugerir respostas com Carlos">
                {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-[var(--nebula)]" />}
              </Button>
            )}
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={header.isAi ? "Pergunte algo ao Carlos…" : "Mensagem (use @carlos pra invocar a IA)"}
              className="flex-1 rounded-full bg-secondary/40 border-white/10"
            />
            {text.trim() ? (
              <Button size="icon" onClick={send} disabled={sending} className="rounded-full cosmic-glow">
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon" variant="ghost"
                onClick={() => setRecording(true)}
                title="Gravar áudio" className="rounded-full"
                disabled={header.isAi}
              >
                <Mic className="h-4 w-4 text-[var(--nebula)]" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Call overlay */}
      {call && user && header.otherUserId && (
        <CallScreen
          mode={call.mode}
          sessionId={call.sessionId}
          isCaller={call.isCaller}
          myUserId={user.id}
          peerUserId={header.otherUserId}
          name={header.displayName}
          avatarUrl={header.avatar_url}
          onEnd={() => { setCall(null); toast.info("Chamada encerrada"); }}
        />
      )}

      {/* PIN dialogs */}
      <PinDialog open={pinOpen} setOpen={setPinOpen} pinValue={pinValue} setPinValue={setPinValue} onSubmit={tryUnlock} />
      <Dialog open={setPinDialogOpen} onOpenChange={setSetPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir PIN para este chat</DialogTitle>
            <DialogDescription>O chat será ocultado e exigirá este PIN para ser revelado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>PIN numérico</Label>
            <Input inputMode="numeric" pattern="[0-9]*" maxLength={8} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="ex: 1234" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSetPinDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={newPin.length < 4}
              onClick={() => {
                lockChat(conversationId, newPin);
                setSetPinDialogOpen(false);
                toast.success("Chat ocultado. Toque para inserir o PIN.");
              }}
            >
              Bloquear chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatRemaining(sec: number): string {
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m`;
  return `${sec}s`;
}

function PinDialog({
  open, setOpen, pinValue, setPinValue, onSubmit,
}: {
  open: boolean; setOpen: (v: boolean) => void;
  pinValue: string; setPinValue: (v: string) => void; onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Inserir PIN</DialogTitle>
          <DialogDescription>Esta órbita está bloqueada.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>PIN</Label>
          <Input
            inputMode="numeric" pattern="[0-9]*" maxLength={8}
            value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>Desbloquear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
