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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Circle, Phone, MoreVertical, LogOut, User as UserIcon, Sparkles, Orbit, ShieldHalf } from "lucide-react";
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
  const { wallpaper, appearance } = useSettings();

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
            "Olá, viajante. Eu sou o Carlos, IA nativa do Cosmos Chat. Posso redigir mensagens, traduzir, resumir conversas, sugerir respostas e te invocar com @carlos em qualquer chat. Pra onde vamos?",
        });
      }
    })();
  }, [user]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`w-full md:w-[380px] flex-shrink-0 border-r border-white/5 glass flex flex-col ${activeConvId ? "hidden md:flex" : "flex"}`}
        style={{ background: wallpaper, backgroundSize: wallpaper.includes("radial-gradient(white") ? "20px 20px, 35px 35px, auto" : undefined }}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center cosmic-glow">
              <Orbit className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-[var(--cosmic)] to-[var(--nebula)] bg-clip-text text-transparent">
              Cosmos Chat
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setSettingsOpen(true)} title="Privacidade & temas">
              <ShieldHalf className="h-4 w-4 text-[var(--nebula)]" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setNewChatOpen(true)} title="Nova conversa">
              <Users className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <ShieldHalf className="mr-2 h-4 w-4" /> Privacidade & temas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="rounded-none h-11 w-full justify-start bg-transparent border-b border-white/5 px-2 gap-1">
            <TabsTrigger value="chats" className="data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"><MessageCircle className="h-4 w-4 mr-1.5" />Conversas</TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"><Circle className="h-4 w-4 mr-1.5" />Órbitas</TabsTrigger>
            <TabsTrigger value="calls" className="data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"><Phone className="h-4 w-4 mr-1.5" />Sinais</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 overflow-y-auto m-0">
            {appearance.statusOnTop && (
              <div className="border-b border-white/5 px-2 py-2">
                <StatusTab compact />
              </div>
            )}
            {appearance.separateGroups ? (
              <Tabs value={chatFilter} onValueChange={(v) => setChatFilter(v as "direct" | "groups")}>
                <TabsList className="w-full justify-start bg-transparent px-2 gap-1 h-9">
                  <TabsTrigger value="direct" className="text-xs data-[state=active]:bg-primary/15">Conversas</TabsTrigger>
                  <TabsTrigger value="groups" className="text-xs data-[state=active]:bg-primary/15">Grupos</TabsTrigger>
                </TabsList>
                <TabsContent value="direct" className="m-0">
                  <ChatList activeId={activeConvId} onSelect={setActiveConvId} filter="direct" />
                </TabsContent>
                <TabsContent value="groups" className="m-0">
                  <ChatList activeId={activeConvId} onSelect={setActiveConvId} filter="groups" />
                </TabsContent>
              </Tabs>
            ) : (
              <ChatList activeId={activeConvId} onSelect={setActiveConvId} />
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

      {/* Main pane */}
      <main className={`flex-1 ${activeConvId ? "flex" : "hidden md:flex"} flex-col`}>
        {activeConvId ? (
          <ChatView conversationId={activeConvId} onBack={() => setActiveConvId(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-28 w-28 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-6 carlos-avatar">
              <Sparkles className="h-12 w-12 text-[var(--nebula)]" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-[var(--cosmic)] to-[var(--nebula)] bg-clip-text text-transparent">
              Cosmos Chat
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Selecione uma órbita para começar. Ou converse com{" "}
              <span className="font-medium text-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[var(--nebula)]" />Carlos
              </span>
              {" "}— digite <span className="font-mono text-[var(--nebula)]">@carlos</span> em qualquer chat pra invocá-lo.
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
