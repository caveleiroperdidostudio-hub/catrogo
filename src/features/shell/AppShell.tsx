import { useState } from "react";
import { MessageCircle, Play, Clapperboard, Camera, Gamepad2 } from "lucide-react";
import { ChatHome } from "@/features/chat/ChatHome";
import { VideoModule } from "@/features/video/VideoModule";
import { ShortsModule } from "@/features/shorts/ShortsModule";
import { SocialModule } from "@/features/social/SocialModule";
import { GamesModule } from "@/features/games/GamesModule";

type ModuleId = "chat" | "video" | "shorts" | "social" | "games";

const TABS: { id: ModuleId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "video", label: "Vídeos", icon: Play },
  { id: "shorts", label: "Shorts", icon: Clapperboard },
  { id: "social", label: "Social", icon: Camera },
  { id: "games", label: "Games", icon: Gamepad2 },
];

export function AppShell() {
  const [active, setActive] = useState<ModuleId>("chat");

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="flex-1 min-h-0 overflow-hidden">
        {active === "chat" && <ChatHome />}
        {active === "video" && <VideoModule />}
        {active === "shorts" && <ShortsModule />}
        {active === "social" && <SocialModule />}
        {active === "games" && <GamesModule />}
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
              <Icon
                className={`h-5 w-5 transition ${isActive ? "text-primary scale-110" : "text-muted-foreground"}`}
              />
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
