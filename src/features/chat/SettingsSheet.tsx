import { useEffect, useRef, useState } from "react";
import { useSettings, type ThemeAccent, type AppFont, type BubbleStyle, type TickStyle, TICK_GLYPHS } from "@/lib/settings-context";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Ghost, Eye, Keyboard, Mic, OrbitIcon, Image as ImageIcon, Palette, Bell, Wallpaper, Video, Loader2, Volume2, Type, MessageSquare, CheckCheck, LayoutGrid, Droplet, Phone, Copy, ShieldCheck } from "lucide-react";
import { requestPushPermission, isPushSupported } from "@/lib/push";
import { myFingerprint } from "@/lib/e2ee";
import { toast } from "sonner";

const FONTS: { id: AppFont; label: string }[] = [
  { id: "default", label: "Padrão" },
  { id: "rounded", label: "Arredondada" },
  { id: "serif", label: "Serifada" },
  { id: "mono", label: "Monoespaçada" },
  { id: "elegant", label: "Elegante" },
  { id: "playful", label: "Divertida" },
];

const BUBBLES: { id: BubbleStyle; label: string }[] = [
  { id: "round", label: "Redondo" },
  { id: "sharp", label: "Quadrado" },
  { id: "minimal", label: "Pílula" },
  { id: "classic", label: "Clássico" },
];

const TICKS: TickStyle[] = ["default", "hearts", "alien", "stars", "rockets"];

const THEMES: { id: ThemeAccent; label: string; sample: string }[] = [
  { id: "cosmos", label: "Roxo Cósmico", sample: "oklch(0.58 0.22 295)" },
  { id: "aurora", label: "Aurora Verde", sample: "oklch(0.7 0.18 155)" },
  { id: "supernova", label: "Supernova Dourada", sample: "oklch(0.78 0.18 70)" },
  { id: "rose", label: "Nebulosa Rosa", sample: "oklch(0.7 0.2 350)" },
  { id: "eclipse", label: "Eclipse Escuro", sample: "oklch(0.55 0.04 280)" },
];

const WALLPAPERS: { id: string; label: string; value: string }[] = [
  { id: "cosmos", label: "Cosmos", value: "radial-gradient(circle at 20% 10%, oklch(0.32 0.12 295 / 0.35), transparent 55%), radial-gradient(circle at 80% 90%, oklch(0.32 0.14 230 / 0.35), transparent 50%), oklch(0.12 0.04 280)" },
  { id: "nebula", label: "Nebulosa", value: "radial-gradient(circle at 30% 20%, oklch(0.4 0.2 340 / 0.4), transparent 60%), radial-gradient(circle at 70% 80%, oklch(0.4 0.2 280 / 0.4), transparent 55%), oklch(0.1 0.05 320)" },
  { id: "aurora", label: "Aurora", value: "linear-gradient(160deg, oklch(0.2 0.1 200), oklch(0.25 0.15 155), oklch(0.18 0.08 250))" },
  { id: "void", label: "Vácuo", value: "linear-gradient(180deg, oklch(0.08 0.02 280), oklch(0.05 0.01 280))" },
  { id: "supernova", label: "Supernova", value: "radial-gradient(circle at 50% 30%, oklch(0.5 0.2 60 / 0.4), transparent 60%), oklch(0.12 0.04 30)" },
  { id: "stars", label: "Campo Estelar", value: "radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px), oklch(0.1 0.03 280)" },
];

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { privacy, setPrivacy, theme, setTheme, wallpaper, setWallpaper, chatWallpaper, setChatWallpaper, appearance, setAppearance } = useSettings();
  const [local, setLocal] = useState(privacy);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [appPhone, setAppPhone] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !open) return;
    supabase.from("profiles").select("app_phone").eq("id", user.id).maybeSingle().then(({ data }) => setAppPhone(data?.app_phone ?? null));
    myFingerprint().then(setFingerprint).catch(() => {});
  }, [user, open]);

  const uploadChatBg = async (file: File, kind: "image" | "video") => {
    if (!user) return;
    if (file.size > 30 * 1024 * 1024) return toast.error("Máximo 30MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? (kind === "video" ? "mp4" : "jpg");
    const path = `${user.id}/wallpaper-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("status-media").upload(path, file, { contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("status-media").getPublicUrl(path);
    setChatWallpaper({ type: kind, value: data.publicUrl });
    setUploading(false);
    toast.success(`Wallpaper ${kind === "video" ? "de vídeo" : "de foto"} aplicado!`);
  };

  const toggle = (k: keyof typeof privacy) => {
    const next = { ...local, [k]: !local[k] };
    setLocal(next);
    setPrivacy(next);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Ghost className="h-5 w-5 text-[var(--cosmic)]" /> Central de Privacidade
          </SheetTitle>
          <SheetDescription>
            Modo Fantasma, temas, wallpapers e personalização do Chat.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 py-5 space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Phone className="h-4 w-4" /> Seu número do CatroGo
            </h3>
            <div className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2">
              <span className="flex-1 font-mono text-sm">{appPhone ?? "—"}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (!appPhone) return;
                  navigator.clipboard.writeText(appPhone).catch(() => {});
                  toast.success("Número copiado");
                }}
                title="Copiar número"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Compartilhe este número para que outras pessoas te encontrem no app.</p>
            {fingerprint && (
              <div className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Código de segurança deste aparelho
                </div>
                <div className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground">{fingerprint}</div>
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Bell className="h-4 w-4" /> Notificações Push
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={async () => {
                if (!isPushSupported()) {
                  toast.info("Push só funciona no app publicado (não no preview).");
                  return;
                }
                const r = await requestPushPermission();
                if (r === "granted") toast.success("Notificações ativadas!");
                else if (r === "denied") toast.error("Permissão negada no navegador.");
                else toast.info("Não suportado neste ambiente.");
              }}
            >
              <Bell className="h-4 w-4 mr-1.5" /> Ativar notificações
            </Button>
            <p className="text-xs text-muted-foreground">Você será avisado de novas mensagens mesmo com o app fechado. Funciona na versão publicada.</p>
          </section>

          <Separator />


          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Ghost className="h-4 w-4" /> Modo Fantasma Total
            </h3>
            <Row icon={<Eye className="h-4 w-4" />} label="Congelar visto por último"
              checked={local.ghostLastSeen} onChange={() => toggle("ghostLastSeen")} />
            <Row icon={<Eye className="h-4 w-4" />} label="Ocultar quando estou online"
              checked={local.ghostOnline} onChange={() => toggle("ghostOnline")} />
            <Row icon={<Keyboard className="h-4 w-4" />} label="Ocultar 'digitando…'"
              checked={local.ghostTyping} onChange={() => toggle("ghostTyping")} />
            <Row icon={<Mic className="h-4 w-4" />} label="Ocultar 'gravando áudio…'"
              checked={local.ghostRecording} onChange={() => toggle("ghostRecording")} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <OrbitIcon className="h-4 w-4" /> Anti-Deletar
            </h3>
            <Row icon={<OrbitIcon className="h-4 w-4" />}
              label="Mostrar mensagens deletadas pelo contato"
              checked={local.antiDelete} onChange={() => toggle("antiDelete")} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <ImageIcon className="h-4 w-4" /> Visualização Única
            </h3>
            <Row icon={<ImageIcon className="h-4 w-4" />}
              label="Reabrir fotos de visualização única infinitas vezes"
              checked={local.bypassViewOnce} onChange={() => toggle("bypassViewOnce")} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Palette className="h-4 w-4" /> Central de Temas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/10 ${
                    theme === t.id ? "border-[var(--cosmic)] cosmic-glow" : "border-border/60"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full ring-2 ring-white/10" style={{ background: t.sample }} />
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Cor de acento personalizada */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Droplet className="h-4 w-4" /> Cor de Acento Personalizada
            </h3>
            <p className="text-xs text-muted-foreground">Defina manualmente o tom de cor de botões, balões e destaques.</p>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Usar cor personalizada</Label>
              <Switch
                checked={appearance.accentHue != null}
                onCheckedChange={(v) => setAppearance({ accentHue: v ? 295 : null })}
              />
            </div>
            {appearance.accentHue != null && (
              <div className="px-1">
                <div
                  className="h-3 rounded-full mb-2"
                  style={{ background: "linear-gradient(to right, oklch(0.6 0.2 0), oklch(0.6 0.2 60), oklch(0.6 0.2 120), oklch(0.6 0.2 180), oklch(0.6 0.2 240), oklch(0.6 0.2 300), oklch(0.6 0.2 360))" }}
                />
                <Slider value={[appearance.accentHue]} min={0} max={360} step={1} onValueChange={(v) => setAppearance({ accentHue: v[0] })} />
              </div>
            )}
          </section>

          <Separator />

          {/* Fontes */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Type className="h-4 w-4" /> Fonte da Interface
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAppearance({ font: f.id })}
                  className={`rounded-lg border px-2 py-2 text-xs transition-colors hover:bg-accent/10 ${appearance.font === f.id ? "border-[var(--cosmic)] cosmic-glow" : "border-border/60"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Estilo de balões */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <MessageSquare className="h-4 w-4" /> Estilo dos Balões
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {BUBBLES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setAppearance({ bubbleStyle: b.id })}
                  className={`rounded-lg border px-1 py-2 text-xs transition-colors hover:bg-accent/10 ${appearance.bubbleStyle === b.id ? "border-[var(--cosmic)] cosmic-glow" : "border-border/60"}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Estilo de ticks */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <CheckCheck className="h-4 w-4" /> Estilo dos Vistos (Ticks)
            </h3>
            <div className="flex gap-2 flex-wrap">
              {TICKS.map((t) => (
                <button
                  key={t}
                  onClick={() => setAppearance({ tickStyle: t })}
                  className={`h-10 w-12 rounded-lg border text-base transition-colors hover:bg-accent/10 ${appearance.tickStyle === t ? "border-[var(--cosmic)] cosmic-glow" : "border-border/60"}`}
                >
                  {TICK_GLYPHS[t]}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Estilo da Home */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <LayoutGrid className="h-4 w-4" /> Estilo da Home
            </h3>
            <Row icon={<OrbitIcon className="h-4 w-4" />} label="Status no topo (estilo Instagram)"
              checked={appearance.statusOnTop} onChange={() => setAppearance({ statusOnTop: !appearance.statusOnTop })} />
            <Row icon={<LayoutGrid className="h-4 w-4" />} label="Separar grupos em abas"
              checked={appearance.separateGroups} onChange={() => setAppearance({ separateGroups: !appearance.separateGroups })} />
          </section>

          <Separator />

          {/* Cabeçalho personalizado */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Eye className="h-4 w-4" /> Cabeçalho da Conversa
            </h3>
            <Row icon={<Eye className="h-4 w-4" />} label="Ocultar nome do contato"
              checked={appearance.hideName} onChange={() => setAppearance({ hideName: !appearance.hideName })} />
            <Row icon={<Mic className="h-4 w-4" />} label="Ocultar botão de chamada"
              checked={appearance.hideCallButton} onChange={() => setAppearance({ hideCallButton: !appearance.hideCallButton })} />
            <Row icon={<ImageIcon className="h-4 w-4" />} label="Ocultar foto de perfil"
              checked={appearance.hideAvatar} onChange={() => setAppearance({ hideAvatar: !appearance.hideAvatar })} />
          </section>

          <Separator />


          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Palette className="h-4 w-4" /> Lobby — Wallpaper
            </h3>
            <p className="text-xs text-muted-foreground">Personalize o fundo da lista de conversas.</p>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWallpaper(w.value)}
                  className={`h-16 rounded-lg border-2 overflow-hidden text-xs text-white/90 flex items-end p-1.5 transition ${
                    wallpaper === w.value ? "border-[var(--cosmic)] cosmic-glow" : "border-border/40"
                  }`}
                  style={{ background: w.value, backgroundSize: w.id === "stars" ? "20px 20px, 35px 35px, auto" : undefined }}
                >
                  <span className="bg-black/40 rounded px-1.5 py-0.5 backdrop-blur-sm">{w.label}</span>
                </button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--nebula)]">
              <Wallpaper className="h-4 w-4" /> Fundo do Chat
            </h3>
            <p className="text-xs text-muted-foreground">Cores, gradientes, foto ou vídeo em loop dentro da conversa.</p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setChatWallpaper({ type: "gradient", value: "stars" })}
                className={`h-14 rounded-lg border-2 chat-bg flex items-end p-1.5 text-xs text-white ${chatWallpaper.value === "stars" && chatWallpaper.type === "gradient" ? "border-[var(--cosmic)] cosmic-glow" : "border-border/40"}`}
              >
                <span className="bg-black/40 px-1.5 rounded">Estelar</span>
              </button>
              {WALLPAPERS.slice(0, 5).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setChatWallpaper({ type: "gradient", value: w.value })}
                  className={`h-14 rounded-lg border-2 overflow-hidden text-xs text-white flex items-end p-1.5 ${chatWallpaper.value === w.value && chatWallpaper.type === "gradient" ? "border-[var(--cosmic)] cosmic-glow" : "border-border/40"}`}
                  style={{ background: w.value }}
                >
                  <span className="bg-black/40 px-1.5 rounded">{w.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { fileRef.current?.setAttribute("accept", "image/*"); fileRef.current?.click(); }} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                Foto
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { fileRef.current?.setAttribute("accept", "video/*"); fileRef.current?.click(); }} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Video className="h-4 w-4 mr-1.5" />}
                Vídeo
              </Button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const kind: "image" | "video" = f.type.startsWith("video/") ? "video" : "image";
                  uploadChatBg(f, kind);
                  e.target.value = "";
                }}
              />
            </div>

            {chatWallpaper.type !== "gradient" && (
              <div className="rounded-lg border border-border/40 p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-12 w-20 rounded overflow-hidden bg-black/40 flex-shrink-0">
                    {chatWallpaper.type === "image" ? (
                      <img src={chatWallpaper.value} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <video src={chatWallpaper.value} className="h-full w-full object-cover" muted loop playsInline autoPlay />
                    )}
                  </div>
                  <div className="text-xs flex-1">
                    <div className="font-medium">{chatWallpaper.type === "video" ? "Vídeo em loop" : "Foto personalizada"}</div>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => setChatWallpaper({ type: "gradient", value: "stars" })}>Remover</button>
                  </div>
                </div>

                {chatWallpaper.type === "video" && (
                  <>
                    <Row
                      icon={<Volume2 className="h-4 w-4" />}
                      label="Ativar som do wallpaper em background"
                      checked={chatWallpaper.soundEnabled}
                      onChange={() => setChatWallpaper({ soundEnabled: !chatWallpaper.soundEnabled })}
                    />
                    {chatWallpaper.soundEnabled && (
                      <div className="px-2 pb-1">
                        <Label className="text-xs text-muted-foreground flex items-center justify-between mb-1.5">
                          <span>Volume</span>
                          <span className="font-mono text-[var(--nebula)]">{chatWallpaper.volume}%</span>
                        </Label>
                        <Slider
                          value={[chatWallpaper.volume]}
                          min={0} max={100} step={1}
                          onValueChange={(v) => setChatWallpaper({ volume: v[0] })}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent/5">
      <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
