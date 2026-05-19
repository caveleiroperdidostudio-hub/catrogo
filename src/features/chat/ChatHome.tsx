import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ChatList } from "./ChatList";
import { ChatView } from "./ChatView";
import { StatusTab } from "./StatusTab";
import { CallsTab } from "./CallsTab";
import { ProfileSheet } from "./ProfileSheet";
import { NewChatDialog } from "./NewChatDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Circle, Phone, MoreVertical, LogOut, User as UserIcon, Sparkles } from "lucide-react";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Ensure Jarvis conversation exists for the user
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("created_by", user.id)
        .eq("name", "Jarvis IA")
        .eq("is_group", false)
        .maybeSingle();
      if (existing) return;
      const { data: conv } = await supabase
        .from("conversations")
        .insert({
          is_group: false,
          name: "Jarvis IA",
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
            "Olá! Eu sou o Jarvis, sua IA do CatroGo. Posso responder perguntas, redigir mensagens, traduzir, resumir e muito mais. Como posso te ajudar hoje?",
        });
      }
    })();
  }, [user]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`w-full md:w-[380px] flex-shrink-0 border-r bg-sidebar flex flex-col ${activeConvId ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-foreground/15 flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">CatroGo</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-primary-foreground/15" onClick={() => setNewChatOpen(true)}>
              <Users className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-primary-foreground/15">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
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
          <TabsList className="rounded-none h-11 w-full justify-start bg-sidebar border-b px-2 gap-1">
            <TabsTrigger value="chats" className="data-[state=active]:bg-accent/20"><MessageCircle className="h-4 w-4 mr-1.5" />Conversas</TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-accent/20"><Circle className="h-4 w-4 mr-1.5" />Status</TabsTrigger>
            <TabsTrigger value="calls" className="data-[state=active]:bg-accent/20"><Phone className="h-4 w-4 mr-1.5" />Ligações</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 overflow-y-auto m-0">
            <ChatList activeId={activeConvId} onSelect={setActiveConvId} />
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/30">
            <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">CatroGo Web</h2>
            <p className="text-muted-foreground max-w-sm">
              Selecione uma conversa para começar. Ou converse com <span className="font-medium text-foreground inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />Jarvis IA</span> a qualquer momento.
            </p>
            {profile && (
              <p className="mt-4 text-xs text-muted-foreground">Conectado como @{profile.username}</p>
            )}
          </div>
        )}
      </main>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onCreated={(id) => setActiveConvId(id)} />
    </div>
  );
}
