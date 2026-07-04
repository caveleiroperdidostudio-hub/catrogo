import { useState, useEffect } from "react";
import { MessageCircle, Play, Clapperboard, Gamepad2, User, ShoppingBag, Package, Gift, ShieldCheck, Sparkles, Rocket } from "lucide-react";
import { ChatHome } from "@/features/chat/ChatHome";
import { VideoModule } from "@/features/video/VideoModule";
import { ShortsModule } from "@/features/shorts/ShortsModule";
import { GamesModule } from "@/features/games/GamesModule";
import { ProfileModule } from "@/features/profile/ProfileModule";
import { StoreModule } from "@/features/store/StoreModule";
import { ModsModule } from "@/features/mods/ModsModule";
import { AiChatModule } from "@/features/ai/AiChatModule";
import { UpdatesModule } from "@/features/updates/UpdatesModule";
import { AdminPanel } from "@/features/admin/AdminPanel";
import { ChristmasMissions, EventCountdownBanner } from "@/features/admin/ChristmasMissions";
import { ChannelView } from "@/features/profile/ChannelView";
import { ChannelProvider } from "@/lib/channel-context";
import { WalletProvider } from "@/lib/wallet-context";
import { EventsProvider, useGlobalEvent } from "@/lib/events-context";
import { useAuth } from "@/lib/auth-context";

type ModuleId = "chat" | "video" | "shorts" | "games" | "ia" | "store" | "mods" | "updates" | "profile" | "admin" | "missions";

const BASE_TABS: { id: ModuleId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "video", label: "Vídeos", icon: Play },
  { id: "shorts", label: "Shorts", icon: Clapperboard },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "ia", label: "IA", icon: Sparkles },
  { id: "mods", label: "Mods", icon: Package },
  { id: "store", label: "Loja", icon: ShoppingBag },
  { id: "updates", label: "Novidades", icon: Rocket },
  { id: "profile", label: "Perfil", icon: User },
];

function ShellInner() {
  const { isOwner } = useAuth();
  const { event } = useGlobalEvent();
  const [active, setActive] = useState<ModuleId>("chat");

  const tabs = [...BASE_TABS];
  if (event) tabs.push({ id: "missions", label: "Natal", icon: Gift });
  if (isOwner) tabs.push({ id: "admin", label: "Comandos", icon: ShieldCheck });

  // se sair do evento estando na aba de missões, volta ao chat
  useEffect(() => {
    if (!event && active === "missions") setActive("chat");
    if (!isOwner && active === "admin") setActive("chat");
  }, [event, isOwner, active]);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      <EventCountdownBanner />
      <div className="flex-1 min-h-0 overflow-hidden">
        {active === "chat" && <ChatHome />}
        {active === "video" && <VideoModule />}
        {active === "shorts" && <ShortsModule />}
        {active === "games" && <GamesModule />}
        {active === "ia" && <AiChatModule />}
        {active === "mods" && <ModsModule />}
        {active === "store" && <StoreModule />}
        {active === "updates" && <UpdatesModule />}
        {active === "profile" && <ProfileModule />}
        {active === "missions" && <ChristmasMissions />}
        {active === "admin" && <AdminPanel />}
      </div>

      <nav className="h-16 shrink-0 border-t border-white/10 glass flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="flex flex-1 min-w-[52px] flex-col items-center justify-center gap-0.5 transition"
            >
              <Icon className={`h-5 w-5 transition ${isActive ? "text-primary scale-110" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell() {
  return (
    <WalletProvider>
      <EventsProvider>
        <ChannelProvider render={(userId, close) => <ChannelView userId={userId} onClose={close} />}>
          <ShellInner />
        </ChannelProvider>
      </EventsProvider>
    </WalletProvider>
  );
}
