import { useState } from "react";
import { MessageCircle, Play, Clapperboard, Gamepad2, User, ShoppingBag } from "lucide-react";
import { ChatHome } from "@/features/chat/ChatHome";
import { VideoModule } from "@/features/video/VideoModule";
import { ShortsModule } from "@/features/shorts/ShortsModule";
import { GamesModule } from "@/features/games/GamesModule";
import { ProfileModule } from "@/features/profile/ProfileModule";
import { StoreModule } from "@/features/store/StoreModule";
import { ChannelView } from "@/features/profile/ChannelView";
import { ChannelProvider } from "@/lib/channel-context";
import { WalletProvider } from "@/lib/wallet-context";

type ModuleId = "chat" | "video" | "shorts" | "games" | "store" | "profile";

const TABS: { id: ModuleId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "video", label: "Vídeos", icon: Play },
  { id: "shorts", label: "Shorts", icon: Clapperboard },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "store", label: "Loja", icon: ShoppingBag },
  { id: "profile", label: "Perfil", icon: User },
];

export function AppShell() {
  const [active, setActive] = useState<ModuleId>("chat");

  return (
    <WalletProvider>
      <ChannelProvider render={(userId, close) => <ChannelView userId={userId} onClose={close} />}>
        <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
          <div className="flex-1 min-h-0 overflow-hidden">
            {active === "chat" && <ChatHome />}
            {active === "video" && <VideoModule />}
            {active === "shorts" && <ShortsModule />}
            {active === "games" && <GamesModule />}
            {active === "store" && <StoreModule />}
            {active === "profile" && <ProfileModule />}
          </div>

          <nav className="h-16 shrink-0 border-t border-white/10 glass flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 transition"
                >
                  <Icon className={`h-5 w-5 transition ${isActive ? "text-primary scale-110" : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </ChannelProvider>
    </WalletProvider>
  );
}
