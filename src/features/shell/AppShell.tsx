import { useState, useEffect, useCallback } from "react";
import { MessageCircle, User, Compass, Crown, Sparkles, Gift, ShieldCheck } from "lucide-react";
import { ChatHome } from "@/features/chat/ChatHome";
import { ProfileModule } from "@/features/profile/ProfileModule";
import { ExploreModule } from "@/features/explore/ExploreModule";
import { AiChatModule } from "@/features/ai/AiChatModule";
import { PremiumModule } from "@/features/premium/PremiumModule";
import { StaffPanel } from "@/features/admin/StaffPanel";
import { AdminPanel } from "@/features/admin/AdminPanel";
import { ChristmasMissions, EventCountdownBanner } from "@/features/admin/ChristmasMissions";
import { ChannelView } from "@/features/profile/ChannelView";
import { ChannelProvider } from "@/lib/channel-context";
import { WalletProvider } from "@/lib/wallet-context";
import { EventsProvider, useGlobalEvent } from "@/lib/events-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppNavProvider, useAppNav, isAllowedPage, type AppPageId } from "@/lib/app-nav";

type ModuleId = AppPageId | "admin" | "missions" | "staff";

const BASE_TABS: { id: ModuleId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "ia", label: "IA", icon: Sparkles },
  { id: "explore", label: "Explorar", icon: Compass },
  { id: "premium", label: "Premium", icon: Crown },
  { id: "profile", label: "Perfil", icon: User },
];

function ShellInner() {
  const { isOwner } = useAuth();
  const { event } = useGlobalEvent();
  const { register } = useAppNav();
  const [active, setActive] = useState<ModuleId>("chat");
  const [settingsSection, setSettingsSection] = useState<string | undefined>(undefined);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.rpc("is_staff").then(({ data }) => {
      if (alive) setIsStaff(data === true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const go = useCallback((id: string, section?: string): boolean => {
    if (!isAllowedPage(id)) return false;
    setActive(id as ModuleId);
    if (section) setSettingsSection(section);
    return true;
  }, []);
  useEffect(() => { register(go); }, [register, go]);

  const tabs = [...BASE_TABS];
  if (event) tabs.push({ id: "missions", label: "Natal", icon: Gift });
  if (isStaff || isOwner) tabs.push({ id: "staff", label: "Equipe", icon: ShieldCheck });
  if (isOwner) tabs.push({ id: "admin", label: "Comandos", icon: ShieldCheck });

  useEffect(() => {
    if (!event && active === "missions") setActive("chat");
    if (!isOwner && active === "admin") setActive("chat");
    if (!isStaff && !isOwner && active === "staff") setActive("chat");
  }, [event, isOwner, isStaff, active]);

  return (
    <div className="app-viewport relative flex flex-col overflow-hidden bg-background safe-top">
      <EventCountdownBanner />
      <div key={active} className="page-transition flex-1 min-h-0 overflow-hidden">
        {active === "chat" && <ChatHome />}
        {active === "ia" && <AiChatModule />}
        {active === "explore" && <ExploreModule />}
        {active === "premium" && <PremiumModule />}
        {active === "staff" && <StaffPanel />}
        {active === "profile" && <ProfileModule initialSection={settingsSection} />}
        {active === "missions" && <ChristmasMissions />}
        {active === "admin" && <AdminPanel />}
      </div>

      <nav
        aria-label="Navegação principal"
        className="shrink-0 border-t border-white/10 glass flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]"
        style={{ height: "calc(var(--ctrg-nav-height, 4rem) + env(safe-area-inset-bottom))" }}
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
              className="ctrg-nav-item group relative flex flex-1 min-w-[var(--ctrg-nav-item-min,52px)] flex-col items-center justify-center gap-0.5"
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
            <AppNavProvider>
              <ShellInner />
            </AppNavProvider>
          </ChannelProvider>
        </NotificationsProvider>
      </EventsProvider>
    </WalletProvider>
  );
}
