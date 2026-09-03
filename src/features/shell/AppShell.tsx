import { useState, useEffect } from "react";
import { MessageCircle, Play, Clapperboard, Gamepad2, User, ShoppingBag, Package, Gift, ShieldCheck, Crown, Sparkles, Rocket, Film, GraduationCap, Shirt } from "lucide-react";
import { ChatHome } from "@/features/chat/ChatHome";
import { VideoModule } from "@/features/video/VideoModule";
import { ShortsModule } from "@/features/shorts/ShortsModule";
import { GamesModule } from "@/features/games/GamesModule";
import { ProfileModule } from "@/features/profile/ProfileModule";
import { StoreModule } from "@/features/store/StoreModule";
import { ModsModule } from "@/features/mods/ModsModule";
import { AiChatModule } from "@/features/ai/AiChatModule";
import { UpdatesModule } from "@/features/updates/UpdatesModule";
import { MoviesModule } from "@/features/movies/MoviesModule";
import { PersonalModule } from "@/features/personal/PersonalModule";
import { SkinsModule } from "@/features/skins/SkinsModule";
import { PremiumModule } from "@/features/premium/PremiumModule";
import { AdminPanel } from "@/features/admin/AdminPanel";
import { ChristmasMissions, EventCountdownBanner } from "@/features/admin/ChristmasMissions";
import { ChannelView } from "@/features/profile/ChannelView";
import { ChannelProvider } from "@/lib/channel-context";
import { WalletProvider } from "@/lib/wallet-context";
import { EventsProvider, useGlobalEvent } from "@/lib/events-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { useAuth } from "@/lib/auth-context";

type ModuleId = "chat" | "movies" | "personal" | "skins" | "video" | "shorts" | "games" | "ia" | "store" | "premium" | "mods" | "updates" | "profile" | "admin" | "missions";

const BASE_TABS: { id: ModuleId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "movies", label: "Filmes", icon: Film },
  { id: "video", label: "Vídeos", icon: Play },
  { id: "shorts", label: "Shorts", icon: Clapperboard },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "ia", label: "IA", icon: Sparkles },
  { id: "personal", label: "Personal", icon: GraduationCap },
  { id: "skins", label: "Skins", icon: Shirt },
  { id: "mods", label: "Mods", icon: Package },
  { id: "store", label: "Loja", icon: ShoppingBag },
  { id: "premium", label: "Premium", icon: Crown },
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
    <div className="app-viewport relative flex flex-col overflow-hidden bg-background">
      <EventCountdownBanner />
      <div key={active} className="page-transition flex-1 min-h-0 overflow-hidden">
        {active === "chat" && <ChatHome />}
        {active === "movies" && <MoviesModule />}
        {active === "personal" && <PersonalModule />}
        {active === "skins" && <SkinsModule />}
        {active === "video" && <VideoModule />}
        {active === "shorts" && <ShortsModule />}
        {active === "games" && <GamesModule />}
        {active === "ia" && <AiChatModule />}
        {active === "mods" && <ModsModule />}
        {active === "store" && <StoreModule />}
        {active === "premium" && <PremiumModule />}
        {active === "updates" && <UpdatesModule />}
        {active === "profile" && <ProfileModule />}
        {active === "missions" && <ChristmasMissions />}
        {active === "admin" && <AdminPanel />}
      </div>

      <nav
        aria-label="Navegação principal"
        className="h-16 shrink-0 border-t border-white/10 glass flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] overflow-x-auto"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
              className="tap-press group relative flex flex-1 min-w-[52px] flex-col items-center justify-center gap-0.5 transition"
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary cosmic-glow" aria-hidden="true" />
              )}
              <Icon
                className={`h-5 w-5 transition-all duration-200 ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {t.label}
              </span>
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
        <NotificationsProvider>
          <ChannelProvider render={(userId, close) => <ChannelView userId={userId} onClose={close} />}>
            <ShellInner />
          </ChannelProvider>
        </NotificationsProvider>
      </EventsProvider>
    </WalletProvider>
  );
}
