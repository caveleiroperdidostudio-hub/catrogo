import { useEffect, useState } from "react";
import { Bell, Crown, Info, Loader2, LogOut, Palette, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useSettings, type ThemeAccent } from "@/lib/settings-context";
import { useCtrgUi, type UiPrefs } from "@/lib/ctrg-ui";
import { APP_VERSION, uiLabel } from "@/lib/ctrg-ui";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChatAppearanceEditor } from "@/features/chat/ChatAppearancePanel";
import { isPushSupported, requestPushPermission } from "@/lib/push";
import { NUV_LOGO_URL } from "@/lib/brand";

type Category = "account" | "appearance" | "notifications" | "about";
const CATEGORIES: { id: Category; label: string; icon: typeof User }[] = [
  { id: "account", label: "Conta", icon: User },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "about", label: "Sobre", icon: Info },
];
const THEMES: { id: ThemeAccent; label: string; color: string }[] = [
  { id: "cosmos", label: "Nuv", color: "oklch(0.58 0.22 295)" },
  { id: "aurora", label: "Aurora", color: "oklch(0.7 0.18 155)" },
  { id: "supernova", label: "Dourado", color: "oklch(0.78 0.18 70)" },
  { id: "rose", label: "Rosa", color: "oklch(0.7 0.2 350)" },
  { id: "eclipse", label: "Neutro", color: "oklch(0.55 0.04 280)" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="px-4 pb-2 pt-5 text-sm font-semibold">{children}</h3>;
}

function AccountSection() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setUsername(profile?.username ?? "");
    setPhone(profile?.app_phone ?? "");
    setBio(profile?.about ?? "");
  }, [profile]);

  const save = async () => {
    if (!user || !name.trim() || !username.trim()) {
      toast.error("Preencha nome e nome de usuário");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name.trim(),
      username: username.trim(),
      app_phone: phone.trim() || null,
      about: bio.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado");
  };

  return (
    <div className="pb-6">
      <SectionTitle>Informações da conta</SectionTitle>
      <div className="space-y-4 px-4 py-2">
        <div className="space-y-1.5"><Label htmlFor="settings-name">Nome</Label><Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="settings-username">Nome de usuário</Label><Input id="settings-username" value={username} onChange={(event) => setUsername(event.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="settings-email">E-mail</Label><Input id="settings-email" value={user?.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label htmlFor="settings-phone">Número do Nuv</Label><Input id="settings-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Seu número" /></div>
        <div className="space-y-1.5"><Label htmlFor="settings-bio">Bio</Label><Input id="settings-bio" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Algo sobre você" /></div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar alterações
        </Button>
      </div>
      <SectionTitle>Privacidade</SectionTitle>
      <p className="px-4 text-sm leading-relaxed text-muted-foreground">
        Somente pessoas autorizadas participam das suas conversas. As preferências visuais ficam neste aparelho e não alteram essas permissões.
      </p>
      <div className="px-4 pt-6"><Button variant="destructive" className="w-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sair da conta</Button></div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useSettings();
  const { prefs, savePrefs, isPro, info } = useCtrgUi();
  const updatePrefs = (patch: Partial<UiPrefs>) => {
    void savePrefs(patch).catch(() => toast.error("Não foi possível salvar a preferência"));
  };

  return (
    <div className="px-4 pb-6">
      <SectionTitle>Cor do app</SectionTitle>
      <div className="grid grid-cols-5 gap-2 px-1">
        {THEMES.map((option) => (
          <button key={option.id} type="button" onClick={() => setTheme(option.id)} aria-pressed={theme === option.id} className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2 ${theme === option.id ? "border-primary bg-primary/10" : "border-border"}`}>
            <span className="h-7 w-7 rounded-full" style={{ background: option.color }} />
            <span className="w-full truncate text-[10px]">{option.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Experiência</SectionTitle>
      <div className="mb-5 space-y-3 rounded-xl border border-border bg-secondary/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="flex items-center gap-2 text-sm font-medium"><Crown className="h-4 w-4 text-primary" />{uiLabel(info)}</div><p className="mt-0.5 text-xs text-muted-foreground">{isPro ? "Recursos visuais premium disponíveis" : "Experiência gratuita completa para conversar"}</p></div>
          <Switch checked={prefs.ui_mode === "PRO"} disabled={!isPro} onCheckedChange={(enabled) => updatePrefs({ ui_mode: enabled ? "PRO" : "STANDARD" })} aria-label="Usar Ctrg OS" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><Label htmlFor="settings-animations">Animações discretas</Label><Switch id="settings-animations" checked={prefs.animations} onCheckedChange={(animations) => updatePrefs({ animations })} /></div>
        <div className="flex items-center justify-between gap-3"><Label htmlFor="settings-effects">Efeitos de vidro</Label><Switch id="settings-effects" checked={prefs.effects} disabled={!isPro} onCheckedChange={(effects) => updatePrefs({ effects })} /></div>
      </div>

      <SectionTitle>Conversas</SectionTitle>
      <div className="pt-1"><ChatAppearanceEditor /></div>
    </div>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);
  const enable = async () => {
    if (!isPushSupported()) {
      toast.info("Notificações em segundo plano funcionam no app publicado.");
      return;
    }
    const result = await requestPushPermission();
    setPermission(result === "granted" ? "granted" : result === "denied" ? "denied" : "default");
    if (result === "granted") toast.success("Notificações ativadas");
    else if (result === "denied") toast.error("Permissão negada no navegador");
    else toast.info("Notificações não disponíveis neste aparelho");
  };
  return (
    <div className="px-4 pb-6">
      <SectionTitle>Novas mensagens</SectionTitle>
      <div className="rounded-xl border border-border bg-secondary/25 p-4">
        <div className="flex items-start gap-3"><Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h4 className="text-sm font-medium">Notificações no aparelho</h4><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Receba avisos de novas mensagens. Você também pode silenciar conversas individuais na lista.</p></div></div>
        <Button className="mt-4 w-full" onClick={enable} disabled={permission === "granted"}>{permission === "granted" ? "Notificações ativadas" : permission === "denied" ? "Verificar permissão" : "Ativar notificações"}</Button>
        {permission === "denied" && <p className="mt-3 text-xs text-muted-foreground">Se a permissão continuar negada, libere as notificações nas configurações do navegador.</p>}
      </div>
    </div>
  );
}

function AboutSection() {
  const { info } = useCtrgUi();
  return (
    <div className="px-4 pb-6 text-center">
      <img src={NUV_LOGO_URL} alt="Nuv" className="mx-auto mt-8 h-24 w-24 object-contain" />
      <h2 className="mt-3 text-2xl font-bold">Nuv</h2>
      <p className="mt-1 text-sm text-muted-foreground">Conversas simples, rápidas e seguras.</p>
      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-border bg-secondary/25 p-4 text-left">
        <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">Versão</span><span>{APP_VERSION}</span></div>
        <div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-muted-foreground">Interface</span><span>{uiLabel(info)}</span></div>
      </div>
      <p className="mx-auto mt-6 flex max-w-sm items-start gap-2 text-left text-xs leading-relaxed text-muted-foreground"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Carlos é o assistente do Nuv e pode ajudar com textos, traduções e resumos quando você pedir.</p>
    </div>
  );
}

export function SettingsModule({ initialCategory }: { initialCategory?: string }) {
  const [category, setCategory] = useState<Category>((initialCategory && CATEGORIES.some((item) => item.id === initialCategory) ? initialCategory : "account") as Category);
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4"><span className="flex-1 font-semibold">Configurações</span></div>
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2 scrollbar-none" role="tablist" aria-label="Seções das configurações">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" role="tab" aria-selected={category === item.id} onClick={() => setCategory(item.id)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ${category === item.id ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}><Icon className="h-4 w-4" />{item.label}</button>;
        })}
      </div>
      <div key={category} className="ctrg-tab-enter min-h-0 flex-1 overflow-y-auto">
        {category === "account" && <AccountSection />}
        {category === "appearance" && <AppearanceSection />}
        {category === "notifications" && <NotificationsSection />}
        {category === "about" && <AboutSection />}
      </div>
    </div>
  );
}
