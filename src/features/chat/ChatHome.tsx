import { useEffect, useState } from "react";
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
import { useSettings } from "@/lib/settings-context";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { MessageCircle, Users, Phone, LogOut, User as UserIcon, Settings, Archive, MessageSquarePlus } from "lucide-react";
import { flushScheduledMessages } from "@/lib/scheduled";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ChatHome() {
  const { user, profile, signOut } = useAuth();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chats");
  const [chatFilter, setChatFilter] = useState<"direct" | "groups">("direct");
  const [profileOpen, setProfileOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { wallpaper, appearance, chatAppearance } = useSettings();

  // Dispara mensagens agendadas que já venceram enquanto o app está aberto
  useEffect(() => {
    if (!user) return;
    const run = () => { flushScheduledMessages(user.id).catch(() => {}); };
    run();
    const t = setInterval(run, 30000);
    return () => clearInterval(t);
  }, [user]);



  // Garante que a conversa com Carlos existe para o usuário
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("created_by", user.id)
        .in("name", ["Carlos", "Jarvis IA"])
        .eq("is_group", false)
        .maybeSingle();
      if (existing) return;
      const { data: conv } = await supabase
        .from("conversations")
        .insert({
          is_group: false,
          name: "Carlos",
          avatar_url: null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (conv) {
        await supabase.from("conversation_members").insert({
          conversation_id: conv.id,
          user_id: user.id,
          is_admin: true,
        });
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: null,
          is_ai: true,
          content:
            "Olá! Eu sou o Carlos, assistente do Nuv. Posso redigir mensagens, traduzir, resumir conversas e sugerir respostas. Me chame com @carlos em qualquer conversa. Como posso ajudar?",
        });
      }
    })();
  }, [user]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Lista de conversas */}
      <aside
        className={`w-full md:w-[380px] flex-shrink-0 border-r border-border flex flex-col bg-background ${activeConvId ? "hidden md:flex" : "flex"}`}
        style={{ background: wallpaper, backgroundSize: wallpaper.includes("radial-gradient(white") ? "20px 20px, 35px 35px, auto" : undefined }}
      >
        {/* Cabeçalho */}
        <header className="h-14 px-3 flex items-center justify-between gap-2 border-b border-border">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={30} />
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">Nuv</span>
          </div>
          <div className="flex items-center gap-0.5">
            <NotificationCenter />
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              onClick={() => setNewChatOpen(true)}
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Mais opções" title="Mais opções">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" /> Ajustes e aparência
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowArchived((v) => !v)}>
                  <Archive className="mr-2 h-4 w-4" />
                  {showArchived ? "Voltar às conversas" : "Conversas arquivadas"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-1 h-12 gap-1">
            <TabsTrigger value="chats" className="h-9 gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />Conversas
            </TabsTrigger>
            <TabsTrigger value="status" className="h-9 gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />Status
            </TabsTrigger>
            <TabsTrigger value="calls" className="h-9 gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
              <Phone className="h-4 w-4" aria-hidden="true" />Chamadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 overflow-y-auto m-0">
            {showArchived && (
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Archive className="h-3.5 w-3.5" aria-hidden="true" /> Conversas arquivadas</span>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowArchived(false)}>
                  Voltar
                </Button>
              </div>
            )}
            {appearance.statusOnTop && activeTab === "chats" && (
              <div className="border-b border-border px-2 py-2">
                <StatusTab compact />
              </div>
            )}
            {appearance.separateGroups ? (
              <Tabs value={chatFilter} onValueChange={(v) => setChatFilter(v as "direct" | "groups")}>
                <TabsList className="w-full justify-start bg-transparent px-2 gap-1 h-10">
                  <TabsTrigger value="direct" className="text-xs data-[state=active]:bg-secondary">Conversas</TabsTrigger>
                  <TabsTrigger value="groups" className="text-xs data-[state=active]:bg-secondary">Grupos</TabsTrigger>
                </TabsList>
                <TabsContent value="direct" className="m-0">
                  <ChatList activeId={activeConvId} onSelect={setActiveConvId} filter="direct" showArchived={showArchived} listDensity={chatAppearance.list} onNewChat={() => setNewChatOpen(true)} />
                </TabsContent>
                <TabsContent value="groups" className="m-0">
                  <ChatList activeId={activeConvId} onSelect={setActiveConvId} filter="groups" showArchived={showArchived} listDensity={chatAppearance.list} onNewChat={() => setNewChatOpen(true)} />
                </TabsContent>
              </Tabs>
            ) : (
              <ChatList activeId={activeConvId} onSelect={setActiveConvId} showArchived={showArchived} listDensity={chatAppearance.list} onNewChat={() => setNewChatOpen(true)} />
            )}

          </TabsContent>
          <TabsContent value="status" className="flex-1 overflow-y-auto m-0 p-4">
            <StatusTab />
          </TabsContent>
          <TabsContent value="calls" className="flex-1 overflow-y-auto m-0 p-4">
            <CallsTab />
          </TabsContent>
        </Tabs>
      </aside>

      {/* Área da conversa */}
      <main className={`flex-1 ${activeConvId ? "flex" : "hidden md:flex"} flex-col`}>
        {activeConvId ? (
          <ChatView conversationId={activeConvId} onBack={() => setActiveConvId(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <BrandMark size={72} className="mb-5 opacity-90" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-1.5">Nuv</h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Escolha uma conversa ao lado para começar. Ou fale com o Carlos digitando{" "}
              <span className="font-mono text-foreground">@carlos</span> em qualquer conversa.
            </p>
            {profile && (
              <p className="mt-4 text-xs text-muted-foreground">Conectado como @{profile.username}</p>
            )}
          </div>
        )}
      </main>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onCreated={(id: string) => setActiveConvId(id)} />
      <IncomingCallListener />
    </div>
  );
}
