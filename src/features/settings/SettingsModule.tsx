import { useEffect, useState } from "react";
import {
  User, Shield, Bell, Palette, Package, Sparkles, Info, LogOut,
  Loader2, ChevronRight, Crown, Smartphone, Globe, Zap, Eye, Type,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSettings, type ThemeAccent } from "@/lib/settings-context";
import { useCtrgUi, type UiPrefs } from "@/lib/ctrg-ui";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { APP_VERSION, uiLabel } from "@/lib/ctrg-ui";

type Category = "account" | "profile" | "privacy" | "notifications" | "appearance" | "ai" | "about";

const CATEGORIES: { id: Category; label: string; icon: typeof User }[] = [
  { id: "account", label: "Conta", icon: User },
  { id: "profile", label: "Perfil", icon: Smartphone },
  { id: "privacy", label: "Privacidade", icon: Shield },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "ai", label: "IA", icon: Sparkles },
  { id: "about", label: "Sobre", icon: Info },
];

const THEMES: { id: ThemeAccent; label: string; color: string }[] = [
  { id: "cosmos", label: "Cósmico", color: "oklch(0.58 0.22 295)" },
  { id: "aurora", label: "Aurora", color: "oklch(0.7 0.18 155)" },
  { id: "supernova", label: "Supernova", color: "oklch(0.78 0.18 70)" },
  { id: "rose", label: "Rosa", color: "oklch(0.7 0.2 350)" },
  { id: "eclipse", label: "Eclipse", color: "oklch(0.55 0.04 280)" },
];

function Row({ icon: Icon, label, desc, children }: { icon: typeof User; label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground truncate">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="ctrg-section-title px-4 pt-4 pb-2">{children}</h3>;
}

function AccountSection() {
  const { user, profile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [phone, setPhone] = useState(profile?.app_phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), username: username.trim(), app_phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  return (
    <div className="space-y-1">
      <SectionTitle>Informações da conta</SectionTitle>
      <div className="px-4 py-2 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@usuario" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">E-mail</Label>
          <Input value={user?.email ?? ""} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Telefone CatroGo</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 ..." />
        </div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar alterações
        </Button>
      </div>

      <SectionTitle>Sessão</SectionTitle>
      <Row icon={Globe} label="Dispositivos conectados" desc="Gerenciar sessões ativas">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
      <Row icon={Shield} label="Autenticação" desc="Senha e segurança">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
      <div className="px-4 py-3">
        <Button variant="destructive" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user, profile } = useAuth();
  const [bio, setBio] = useState(profile?.about ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ about: bio.trim() || null }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Bio atualizada");
  };

  return (
    <div className="space-y-1">
      <SectionTitle>Identidade</SectionTitle>
      <div className="flex flex-col items-center gap-3 px-4 py-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl">{(profile?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm">Alterar foto</Button>
      </div>
      <div className="px-4 py-2 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Bio</Label>
          <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Sobre você" />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar bio
        </Button>
      </div>

      <SectionTitle>Personalização</SectionTitle>
      <Row icon={Palette} label="Tema do perfil" desc="Cor de destaque e banner">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
      <Row icon={Type} label="Estilo dos cards" desc="Layout e aparência">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
      <Row icon={Crown} label="Badges e verificação" desc="Selos no perfil">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
    </div>
  );
}

function PrivacySection() {
  const { privacy, setPrivacy } = useSettings();
  const [profilePublic, setProfilePublic] = useState(true);
  const [whoCanMsg, setWhoCanMsg] = useState("todos");

  const toggle = (k: keyof typeof privacy) => setPrivacy({ ...privacy, [k]: !privacy[k] });

  return (
    <div className="space-y-1">
      <SectionTitle>Modo Fantasma</SectionTitle>
      <Row icon={Eye} label="Última vista oculta" desc="Não mostrar quando você foi visto por último">
        <Switch checked={privacy.ghostLastSeen} onCheckedChange={() => toggle("ghostLastSeen")} />
      </Row>
      <Row icon={Eye} label="Online oculto" desc="Não mostrar que você está online">
        <Switch checked={privacy.ghostOnline} onCheckedChange={() => toggle("ghostOnline")} />
      </Row>
      <Row icon={Type} label="Digitando oculto" desc="Não mostrar que você está digitando">
        <Switch checked={privacy.ghostTyping} onCheckedChange={() => toggle("ghostTyping")} />
      </Row>
      <Row icon={Zap} label="Gravando oculto" desc="Não mostrar que você está gravando áudio">
        <Switch checked={privacy.ghostRecording} onCheckedChange={() => toggle("ghostRecording")} />
      </Row>

      <SectionTitle>Controle de conteúdo</SectionTitle>
      <Row icon={Shield} label="Anti-excluir" desc="Notificar quando alguém apaga uma mensagem">
        <Switch checked={privacy.antiDelete} onCheckedChange={() => toggle("antiDelete")} />
      </Row>
      <Row icon={Eye} label="Burlar ver uma vez" desc="Ver mensagens efêmeras sem limite">
        <Switch checked={privacy.bypassViewOnce} onCheckedChange={() => toggle("bypassViewOnce")} />
      </Row>

      <SectionTitle>Visibilidade</SectionTitle>
      <Row icon={User} label="Perfil público" desc="Qualquer pessoa pode ver seu perfil">
        <Switch checked={profilePublic} onCheckedChange={setProfilePublic} />
      </Row>
      <Row icon={User} label="Quem pode enviar mensagens" desc={whoCanMsg === "todos" ? "Todos" : "Apenas contatos"}>
        <Switch checked={whoCanMsg === "todos"} onCheckedChange={(v) => setWhoCanMsg(v ? "todos" : "contatos")} />
      </Row>
    </div>
  );
}

function NotificationsSection() {
  const [push, setPush] = useState(false);
  const [cats, setCats] = useState({ messages: true, followers: true, groups: true, mods: true, updates: true, ai: true, system: true });

  const toggle = (k: keyof typeof cats) => setCats({ ...cats, [k]: !cats[k] });

  return (
    <div className="space-y-1">
      <SectionTitle>Notificações push</SectionTitle>
      <Row icon={Bell} label="Notificações push" desc="Receber notificações no dispositivo">
        <Switch checked={push} onCheckedChange={setPush} />
      </Row>

      <SectionTitle>Categorias</SectionTitle>
      <Row icon={User} label="Mensagens"><Switch checked={cats.messages} onCheckedChange={() => toggle("messages")} /></Row>
      <Row icon={User} label="Seguidores"><Switch checked={cats.followers} onCheckedChange={() => toggle("followers")} /></Row>
      <Row icon={User} label="Grupos"><Switch checked={cats.groups} onCheckedChange={() => toggle("groups")} /></Row>
      <Row icon={Package} label="Mods"><Switch checked={cats.mods} onCheckedChange={() => toggle("mods")} /></Row>
      <Row icon={Zap} label="Atualizações"><Switch checked={cats.updates} onCheckedChange={() => toggle("updates")} /></Row>
      <Row icon={Sparkles} label="IA"><Switch checked={cats.ai} onCheckedChange={() => toggle("ai")} /></Row>
      <Row icon={Info} label="Sistema"><Switch checked={cats.system} onCheckedChange={() => toggle("system")} /></Row>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme, appearance, setAppearance } = useSettings();
  const { prefs, savePrefs, isPro, info, flags } = useCtrgUi();

  const updatePrefs = (patch: Partial<UiPrefs>) => savePrefs(patch);

  return (
    <div className="space-y-1">
      <SectionTitle>Ctrg UI</SectionTitle>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between rounded-2xl glass border border-white/10 p-4">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              {isPro ? <Crown className="h-4 w-4 text-amber-400" /> : <Palette className="h-4 w-4 text-primary" />}
              {uiLabel(info)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isPro ? "Experiência premium ativa" : "Modo padrão"}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={prefs.ui_mode === "STANDARD" ? "default" : "outline"}
              onClick={() => updatePrefs({ ui_mode: "STANDARD" })}
            >
              Padrão
            </Button>
            <Button
              size="sm"
              variant={prefs.ui_mode === "PRO" ? "default" : "outline"}
              onClick={() => isPro ? updatePrefs({ ui_mode: "PRO" }) : toast.info("Ctrg UI Pro requer o Prêmio do App")}
              className={isPro ? "" : "opacity-50"}
            >
              <Crown className="h-3.5 w-3.5 mr-1" /> Pro
            </Button>
          </div>
        </div>
      </div>

      <SectionTitle>Tema</SectionTitle>
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition min-w-[72px] ${
              theme === t.id ? "border-primary/60 bg-primary/10" : "border-white/10"
            }`}
          >
            <span className="h-8 w-8 rounded-full" style={{ background: t.color }} />
            <span className="text-[11px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Interface</SectionTitle>
      <Row icon={Zap} label="Animações" desc="Transições e microinterações">
        <Switch checked={prefs.animations} onCheckedChange={(v) => updatePrefs({ animations: v })} />
      </Row>
      <Row icon={Sparkles} label="Efeitos visuais" desc="Glow e blur premium">
        <Switch checked={prefs.effects} onCheckedChange={(v) => updatePrefs({ effects: v })} />
      </Row>

      <SectionTitle>Densidade</SectionTitle>
      <div className="px-4 py-2 flex gap-2">
        {(["compact", "comfortable", "spacious"] as const).map((d) => (
          <button
            key={d}
            onClick={() => updatePrefs({ density: d })}
            className={`flex-1 rounded-xl border p-3 text-sm font-medium transition ${
              prefs.density === d ? "border-primary/60 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"
            }`}
          >
            {d === "compact" ? "Compacta" : d === "comfortable" ? "Confortável" : "Espaçada"}
          </button>
        ))}
      </div>

      <SectionTitle>Tamanho dos elementos</SectionTitle>
      <div className="px-4 py-3 space-y-2">
        <Slider
          value={[prefs.element_scale * 100]}
          min={80}
          max={120}
          step={5}
          onValueChange={(v) => updatePrefs({ element_scale: v[0] / 100 })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>80%</span><span>{Math.round(prefs.element_scale * 100)}%</span><span>120%</span>
        </div>
      </div>

      <SectionTitle>Fonte</SectionTitle>
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {([
          { id: "default", label: "Padrão" },
          { id: "rounded", label: "Arredondada" },
          { id: "serif", label: "Serifada" },
          { id: "mono", label: "Mono" },
          { id: "elegant", label: "Elegante" },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setAppearance({ font: f.id })}
            className={`rounded-xl border px-4 py-2 text-sm transition ${
              appearance.font === f.id ? "border-primary/60 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <SectionTitle>Estilo dos balões</SectionTitle>
      <div className="px-4 py-2 flex gap-2">
        {([
          { id: "round", label: "Redondo" },
          { id: "sharp", label: "Quadrado" },
          { id: "minimal", label: "Pílula" },
          { id: "classic", label: "Clássico" },
        ] as const).map((b) => (
          <button
            key={b.id}
            onClick={() => setAppearance({ bubbleStyle: b.id })}
            className={`flex-1 rounded-xl border p-2.5 text-sm transition ${
              appearance.bubbleStyle === b.id ? "border-primary/60 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AiSection() {
  const { flags } = useCtrgUi();
  const [confirmActions, setConfirmActions] = useState(true);
  const [aiPrivacy, setAiPrivacy] = useState(true);

  return (
    <div className="space-y-1">
      <SectionTitle>Assistente</SectionTitle>
      <Row icon={Sparkles} label="Navegação por IA" desc="A IA pode abrir telas do app">
        <Switch checked={flags.ai_navigation_enabled !== false} onCheckedChange={() => {}} />
      </Row>
      <Row icon={Shield} label="Confirmar ações" desc="Pedir confirmação antes de ações destrutivas">
        <Switch checked={confirmActions} onCheckedChange={setConfirmActions} />
      </Row>
      <Row icon={Eye} label="Privacidade da IA" desc="Não compartilhar dados sensíveis">
        <Switch checked={aiPrivacy} onCheckedChange={setAiPrivacy} />
      </Row>

      <SectionTitle>Permissões</SectionTitle>
      <Row icon={User} label="Consultar perfil" desc="A IA pode ver suas informações">
        <Switch checked disabled />
      </Row>
      <Row icon={Package} label="Buscar mods" desc="A IA pode procurar mods">
        <Switch checked disabled />
      </Row>
      <Row icon={Bell} label="Ver notificações" desc="A IA pode ver suas notificações">
        <Switch checked disabled />
      </Row>
      <Row icon={Globe} label="Abrir páginas" desc="A IA pode navegar no app">
        <Switch checked={flags.ai_navigation_enabled !== false} disabled />
      </Row>
    </div>
  );
}

function AboutSection() {
  const { info, isPro } = useCtrgUi();

  return (
    <div className="space-y-1">
      <div className="flex flex-col items-center gap-3 px-4 py-8">
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center cosmic-glow">
          <Sparkles className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold">CatroGo</h2>
        <p className="text-sm text-muted-foreground">Versão {APP_VERSION}</p>
      </div>

      <SectionTitle>Interface</SectionTitle>
      <Row icon={Palette} label="Sistema visual" desc={uiLabel(info)}>
        <span className="text-xs text-muted-foreground">{info.kind === "pro" ? "Pro" : "Padrão"}</span>
      </Row>
      <Row icon={Crown} label="Ctrg UI Pro" desc={isPro ? "Desbloqueado" : "Bloqueado — requer Prêmio do App"}>
        {isPro ? <Crown className="h-4 w-4 text-amber-400" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
      </Row>
      <Row icon={Info} label="Plataforma" desc="CatroGo Platform" />

      <SectionTitle>Explorar</SectionTitle>
      <Row icon={Zap} label="Histórico de versões" desc="Novidades e mudanças">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
      <Row icon={Smartphone} label="Museu" desc="Experimente versões antigas">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>
      <Row icon={Info} label="Créditos" desc="Quem construiu o CatroGo">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Row>

      <SectionTitle>Legal</SectionTitle>
      <Row icon={Shield} label="Termos de uso"><ChevronRight className="h-4 w-4 text-muted-foreground" /></Row>
      <Row icon={Shield} label="Política de privacidade"><ChevronRight className="h-4 w-4 text-muted-foreground" /></Row>
    </div>
  );
}

export function SettingsModule({ initialCategory }: { initialCategory?: string }) {
  const [cat, setCat] = useState<Category>(
    (initialCategory && CATEGORIES.some(c => c.id === initialCategory) ? initialCategory : "account") as Category
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-14 shrink-0 px-4 flex items-center border-b border-white/5">
        <span className="font-semibold flex-1">Configurações</span>
      </div>

      {/* Category chips */}
      <div className="shrink-0 border-b border-white/5 px-2 py-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                active ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div key={cat} className="ctrg-tab-enter flex-1 overflow-y-auto pb-4">
        {cat === "account" && <AccountSection />}
        {cat === "profile" && <ProfileSection />}
        {cat === "privacy" && <PrivacySection />}
        {cat === "notifications" && <NotificationsSection />}
        {cat === "appearance" && <AppearanceSection />}
        {cat === "ai" && <AiSection />}
        {cat === "about" && <AboutSection />}
      </div>
    </div>
  );
}
