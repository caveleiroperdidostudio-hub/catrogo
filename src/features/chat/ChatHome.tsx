import { useEffect, useState } from "react";
import { Circle, LogOut, MessageCircle, MoreVertical, Phone, Plus, Settings, Sparkles, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ChatList } from "./ChatList";
import { ChatView } from "./ChatView";
import { StatusTab } from "./StatusTab";
import { CallsTab } from "./CallsTab";
import { ProfileSheet } from "./ProfileSheet";
import { NewChatDialog } from "./NewChatDialog";
import { SettingsSheet } from "./SettingsSheet";
import { IncomingCallListener } from "./IncomingCallListener";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { flushScheduledMessages } from "@/lib/scheduled";
import { chatAppearanceAttributes } from "@/lib/chat-appearance";
import { useSettings } from "@/lib/settings-context";
import { NUV_LOGO_URL } from "@/lib/brand";

export function ChatHome() {
  const { user, profile, signOut } = useAuth();
  const { chatAppearance } = useSettings();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chats");
  const [profileOpen, setProfileOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const run = () => {
      flushScheduledMessages(user.id).catch(() => {});
    };
    run();
    const timer = setInterval(run, 30000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("created_by", user.id)
        .in("name", ["Carlos", "Jarvis IA"])
        .eq("is_group", false)
        .limit(1)
        .maybeSingle();
      if (existing) return;
      const { data: conversation } = await supabase
        .from("conversations")
        .insert({ is_group: false, name: "Carlos", avatar_url: null, created_by: user.id })
        .select("id")
        .single();
      if (!conversation) return;
      await supabase.from("conversation_members").insert({ conversation_id: conversation.id, user_id: user.id, is_admin: true });
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: null,
        is_ai: true,
        content: "Olá! Eu sou o Carlos, assistente do Nuv. Posso ajudar a escrever, traduzir e resumir mensagens. Como posso ajudar?",
      });
    })();
  }, [user]);

  return (
    <div className="flex h-full overflow-hidden">
      <aside
        className={`chat-surface w-full flex-shrink-0 flex-col border-r border-border md:flex md:w-[380px] ${activeConvId ? "hidden" : "flex"}`}
        {...chatAppearanceAttributes(chatAppearance)}
      >
        <header className="chat-chrome flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={NUV_LOGO_URL} alt="" className="h-10 w-10 shrink-0 object-contain" />
            <div>
              <div className="font-display text-xl font-bold tracking-tight">Nuv</div>
              <div className="text-[11px] text-muted-foreground">suas conversas</div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <NotificationCenter />
            <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => setNewChatOpen(true)} title="Nova conversa" aria-label="Nova conversa">
              <Plus className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Mais opções">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" /> Ajustes das conversas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-12 w-full justify-start gap-1 rounded-none border-b border-border bg-transparent px-2">
            <TabsTrigger value="chats" className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-foreground">
              <MessageCircle className="h-4 w-4" /> Conversas
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-foreground">
              <Circle className="h-4 w-4" /> Órbitas
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-foreground">
              <Phone className="h-4 w-4" /> Chamadas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chats" className="m-0 min-h-0 flex-1 overflow-y-auto">
            <ChatList activeId={activeConvId} onSelect={setActiveConvId} onNewChat={() => setNewChatOpen(true)} />
          </TabsContent>
          <TabsContent value="status" className="m-0 min-h-0 flex-1 overflow-y-auto p-4">
            <StatusTab />
          </TabsContent>
          <TabsContent value="calls" className="m-0 min-h-0 flex-1 overflow-y-auto p-4">
            <CallsTab />
          </TabsContent>
        </Tabs>
      </aside>

      <main className={`flex-1 flex-col ${activeConvId ? "flex" : "hidden md:flex"}`}>
        {activeConvId ? (
          <ChatView conversationId={activeConvId} onBack={() => setActiveConvId(null)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <img src={NUV_LOGO_URL} alt="Nuv" className="mb-5 h-24 w-24 object-contain" />
            <h2 className="text-2xl font-semibold">Conversas simples, do seu jeito</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Escolha uma conversa ou toque no botão de adicionar para começar.
            </p>
            {profile && <p className="mt-5 text-xs text-muted-foreground">Conectado como @{profile.username}</p>}
            <Sparkles className="mt-6 h-4 w-4 text-primary" aria-hidden="true" />
          </div>
        )}
      </main>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onCreated={setActiveConvId} />
      <IncomingCallListener />
    </div>
  );
}
