import { useState, useEffect, useCallback, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
  const navRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, index: 0 });

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

  const updateDrag = useCallback((clientX: number) => {
    const nav = navRef.current;
    if (!nav || tabs.length === 0) return;
    const rect = nav.getBoundingClientRect();
    const inset = window.innerWidth <= 380 ? 3.2 : 5.44;
    const trackWidth = Math.max(rect.width - inset * 2, 0);
    const itemWidth = trackWidth / tabs.length;
    const center = Math.min(Math.max(clientX - rect.left - inset, itemWidth / 2), trackWidth - itemWidth / 2);
    const offset = center - itemWidth / 2;
    dragRef.current.index = Math.min(tabs.length - 1, Math.max(0, Math.round(offset / itemWidth)));
    nav.style.setProperty("--ctrg-drag-offset", `${offset}px`);
  }, [tabs]);

  const handleNavPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { active: true, moved: false, startX: event.clientX, index: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    updateDrag(event.clientX);
  }, [updateDrag]);

  const handleNavPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!dragRef.current.active) return;
    if (Math.abs(event.clientX - dragRef.current.startX) > 5) dragRef.current.moved = true;
    updateDrag(event.clientX);
  }, [updateDrag]);

  const finishNavDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const chosen = tabs[dragRef.current.index];
    if (dragRef.current.moved && chosen) setActive(chosen.id);
    event.currentTarget.removeAttribute("data-dragging");
    event.currentTarget.style.removeProperty("--ctrg-drag-offset");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, [tabs]);

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
        ref={navRef}
        aria-label="Navegação principal"
        className="ctrg-liquid-nav glass shrink-0"
        onPointerDown={handleNavPointerDown}
        onPointerMove={handleNavPointerMove}
        onPointerUp={finishNavDrag}
        onPointerCancel={finishNavDrag}
        style={{
          height: "calc(var(--ctrg-nav-height, 4rem) + env(safe-area-inset-bottom))",
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          "--ctrg-tab-count": tabs.length,
          "--ctrg-active-tab": Math.max(0, tabs.findIndex((tab) => tab.id === active)),
        } as CSSProperties}
      >
        <span className="ctrg-liquid-nav-indicator" aria-hidden="true" />
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (dragRef.current.moved) {
                  dragRef.current.moved = false;
                  return;
                }
                setActive(t.id);
              }}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
              className="ctrg-nav-item group relative z-10 flex min-w-0 flex-col items-center justify-center gap-0.5"
            >
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
