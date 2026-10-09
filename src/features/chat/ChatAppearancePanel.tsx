import { useState, type CSSProperties } from "react";
import { Palette, RotateCcw, Save, Trash2, Check, MessageCircle, MoreHorizontal, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useSettings } from "@/lib/settings-context";
import { useCtrgUi } from "@/lib/ctrg-ui";
import { chatAppearanceAttributes, normalizeChatAppearance, DEFAULT_CHAT_APPEARANCE, type ChatAppearance } from "@/lib/chat-appearance";
import { toast } from "sonner";

function Choices<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">{label}</legend>
    <div className="flex flex-wrap gap-2">{options.map((option) => <Button key={option.value} size="sm" variant={value === option.value ? "default" : "outline"}
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</Button>)}</div>
  </fieldset>;
}

export function ChatAppearanceEditor({ conversationId, onApplied }: { conversationId?: string; onApplied?: () => void }) {
  const settings = useSettings();
  const { isOs, prefs, savePrefs } = useCtrgUi();
  const [draft, setDraft] = useState<ChatAppearance>(() => settings.conversationAppearance[conversationId ?? ""] ?? settings.chatAppearance);
  const [profileName, setProfileName] = useState("");
  const [saving, setSaving] = useState(false);
  const patch = (value: Partial<ChatAppearance>) => setDraft((d) => normalizeChatAppearance({ ...d, ...value }));
  const apply = async () => {
    setSaving(true);
    try {
      if (isOs && draft.glass !== "off" && prefs.skin !== "glass") await savePrefs({ skin: "glass", ui_mode: "PRO" });
      settings.setChatAppearance(normalizeChatAppearance(draft, isOs), conversationId);
      toast.success("Aparência das conversas salva neste aparelho"); onApplied?.();
    } catch { toast.error("Não foi possível salvar. Tente novamente."); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <div className="chat-surface chat-appearance-preview overflow-hidden rounded-lg border border-border" {...chatAppearanceAttributes(draft)}
      style={{ "--chat-radius": `${draft.radius}px` } as CSSProperties} aria-label="Prévia da conversa">
      <div className="chat-chrome grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground"><MessageCircle className="h-4 w-4" /></span><span className="truncate font-semibold">Conversa</span></div><MoreHorizontal className="h-5 w-5 shrink-0" />
      </div>
      <div className="chat-transcript space-y-3 p-4">
        <div className="chat-message chat-message-in w-fit max-w-[85%]">Vamos nos encontrar amanhã?<span className="chat-message-time">18:42</span></div>
        <div className="chat-message chat-message-out ml-auto w-fit max-w-[85%]">Combinado! Até amanhã 💚<span className="chat-message-time">18:43</span></div>
      </div>
    </div>
    <Choices label="Tema" value={draft.scheme} options={[{ value: "dark", label: "Escuro" }, { value: "light", label: "Claro" }]} onChange={(scheme) => patch({ scheme })} />
    <fieldset><legend className="mb-3 text-sm font-medium">Cores dos balões e destaque</legend><div className="flex gap-3">{([
      ["original", "Original"], ["ocean", "Oceano"], ["forest", "Floresta"], ["berry", "Framboesa"], ["graphite", "Grafite"],
    ] as const).map(([palette, label]) => <Button key={palette} size="icon" variant="outline" className="chat-swatch rounded-full" data-swatch={palette} title={label} aria-label={label} aria-pressed={draft.palette === palette} onClick={() => patch({ palette })}>{draft.palette === palette && <Check className="h-4 w-4" />}</Button>)}</div></fieldset>
    <Choices label="Estilo dos balões" value={draft.bubble} options={[{ value: "round", label: "Suave" }, { value: "classic", label: "Clássico" }, { value: "sharp", label: "Reto" }, { value: "minimal", label: "Minimal" }]} onChange={(bubble) => patch({ bubble })} />
    <div className="space-y-3"><Label>Arredondamento · {draft.radius}</Label><Slider min={4} max={24} step={2} value={[draft.radius]} onValueChange={([radius]) => patch({ radius })} aria-label="Arredondamento dos balões" /></div>
    <Choices label="Fundo" value={draft.background} options={[{ value: "default", label: "Atual" }, { value: "plain", label: "Liso" }, { value: "grid", label: "Trama" }]} onChange={(background) => patch({ background })} />
    <Choices label="Espaçamento das mensagens" value={draft.density} options={[{ value: "compact", label: "Compacto" }, { value: "comfortable", label: "Confortável" }, { value: "spacious", label: "Amplo" }]} onChange={(density) => patch({ density })} />
    {!conversationId && <Choices label="Lista de conversas" value={draft.list} options={[{ value: "comfortable", label: "Confortável" }, { value: "compact", label: "Compacta" }]} onChange={(list) => patch({ list })} />}
    <section className="space-y-3 border-t border-border pt-5"><h3 className="flex items-center gap-2 text-sm font-medium"><Crown className="h-4 w-4 text-primary" /> Glass UI · Premium</h3>
      <Choices label="Vidro" value={draft.glass} options={[{ value: "off", label: "Padrão" }, { value: "soft", label: "Suave" }, { value: "crystal", label: "Cristal" }, { value: "smoked", label: "Fumê" }]} onChange={(glass) => patch({ glass })} />
      {!isOs && draft.glass !== "off" && <p className="text-xs text-muted-foreground">Prévia disponível. Aplicação exclusiva do Ctrg OS.</p>}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><Label htmlFor="chat-motion">Animações</Label><Switch id="chat-motion" checked={prefs.animations} onCheckedChange={(animations) => { void savePrefs({ animations }).catch(() => toast.error("Não foi possível salvar")); }} /></div>
    </section>
    {isOs && <section className="space-y-3 border-t border-border pt-5"><h3 className="text-sm font-medium">Meus estilos</h3><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input aria-label="Nome do estilo" placeholder="Nome do estilo" maxLength={32} value={profileName} onChange={(e) => setProfileName(e.target.value)} /><Button size="icon" variant="outline" title="Salvar estilo" disabled={!profileName.trim()} onClick={() => { settings.saveAppearanceProfile(profileName, draft); setProfileName(""); }}><Save className="h-4 w-4" /></Button></div>
      {settings.appearanceProfiles.map((profile) => <div key={profile.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Button variant="outline" className="justify-start truncate" onClick={() => setDraft(profile.value)}>{profile.name}</Button><Button size="icon" variant="ghost" title={`Excluir ${profile.name}`} onClick={() => settings.removeAppearanceProfile(profile.name)}><Trash2 className="h-4 w-4" /></Button></div>)}
    </section>}
    <div className="sticky bottom-0 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border bg-background py-3"><Button size="icon" variant="outline" title="Restaurar padrão" onClick={() => { settings.resetChatAppearance(conversationId); setDraft(DEFAULT_CHAT_APPEARANCE); }}><RotateCcw className="h-4 w-4" /></Button><Button onClick={apply} disabled={saving || (!isOs && draft.glass !== "off")}><Check className="mr-2 h-4 w-4" />{saving ? "Salvando…" : "Aplicar aparência"}</Button></div>
  </div>;
}

export function ChatAppearancePanel({ open, onOpenChange, conversationId }: { open: boolean; onOpenChange: (open: boolean) => void; conversationId?: string }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Aparência das conversas</SheetTitle><SheetDescription>{conversationId ? "Esta conversa · neste aparelho" : "Todas as conversas · neste aparelho"}</SheetDescription></SheetHeader><div className="px-4 pb-5">{open && <ChatAppearanceEditor conversationId={conversationId} onApplied={() => onOpenChange(false)} />}</div></SheetContent></Sheet>;
}