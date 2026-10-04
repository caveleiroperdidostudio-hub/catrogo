import { useEffect, useState } from "react";
import { LogOut, Settings, BadgeCheck, Shield, Bell, Palette, User as UserIcon, Info, Sparkles, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getFollowStats } from "@/lib/ugc";
import { SettingsModule } from "@/features/settings/SettingsModule";
import { useAppNav } from "@/lib/app-nav";

export function ProfileModule({ initialSection }: { initialSection?: string }) {
  const { user, profile, signOut } = useAuth();
  const { go } = useAppNav();
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [isPremium, setIsPremium] = useState(false);
  const [badges, setBadges] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getFollowStats(user.id),
      supabase.rpc("is_premium", { _user_id: user.id }),
      supabase.from("user_badges").select("type_key").eq("user_id", user.id),
    ]).then(([s, p, b]) => {
      setStats({ followers: s.followers, following: s.following });
      setIsPremium(!!p.data);
      setBadges((b.data ?? []).map((r: { type_key: string }) => r.type_key));
    });
  }, [user]);

  // If navigated with a section hint, open settings
  useEffect(() => {
    if (initialSection) setShowSettings(true);
  }, [initialSection]);

  if (!user) return null;

  if (showSettings) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="glass h-12 shrink-0 flex items-center gap-2 px-3 border-b border-white/5">
          <button onClick={() => setShowSettings(false)} className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <ChevronRight className="h-4 w-4 rotate-180" /> Perfil
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <SettingsModule initialCategory={initialSection} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="glass h-12 flex items-center px-4 border-b border-white/5">
        <span className="font-semibold flex-1">Perfil</span>
        <Button size="icon" variant="ghost" onClick={signOut} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="p-5 flex flex-col items-center gap-3 border-b border-white/5">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{(profile?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {isPremium && (
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary border-2 border-background">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </span>
            )}
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-lg flex items-center gap-1.5 justify-center">
              {profile?.display_name}
              {badges.length > 0 && <BadgeCheck className="h-4 w-4 text-sky-400" />}
            </h2>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
            {profile?.about && <p className="text-sm mt-1 max-w-xs">{profile.about}</p>}
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="font-semibold">{stats.followers}</p><p className="text-xs text-muted-foreground">seguidores</p></div>
            <div><p className="font-semibold">{stats.following}</p><p className="text-xs text-muted-foreground">seguindo</p></div>
          </div>
        </div>

        {/* Quick links */}
        <div className="p-2 space-y-1">
          <ProfileLink icon={Settings} label="Configurações" desc="Conta, privacidade, aparência e mais" onClick={() => setShowSettings(true)} />
          <ProfileLink icon={BadgeCheck} label="Selos" desc="Solicite selos de verificação" onClick={() => go("explore")} />
          <ProfileLink icon={Shield} label="Privacidade" desc="Modo fantasma, bloqueios e segurança" onClick={() => setShowSettings(true)} />
          <ProfileLink icon={Bell} label="Notificações" desc="Push, categorias e preferências" onClick={() => setShowSettings(true)} />
          <ProfileLink icon={Palette} label="Aparência" desc="Tema, fonte, balões e densidade" onClick={() => setShowSettings(true)} />
          <ProfileLink icon={Info} label="Sobre" desc="Versão, termos e museu" onClick={() => go("explore")} />
        </div>
      </div>
    </div>
  );
}

function ProfileLink({ icon: Icon, label, desc, onClick }: { icon: typeof UserIcon; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ctrg-glass-row w-full flex items-center gap-3 rounded-xl px-3 py-3 transition"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
