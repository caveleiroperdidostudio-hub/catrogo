import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeAccent = "cosmos" | "aurora" | "supernova" | "rose" | "eclipse";

export type AppFont = "default" | "rounded" | "serif" | "mono" | "elegant" | "playful";
export type BubbleStyle = "round" | "sharp" | "minimal" | "classic";
export type TickStyle = "default" | "hearts" | "alien" | "stars" | "rockets";

export type PrivacyFlags = {
  ghostLastSeen: boolean;
  ghostOnline: boolean;
  ghostTyping: boolean;
  ghostRecording: boolean;
  antiDelete: boolean;
  bypassViewOnce: boolean;
};

export type EphemeralSetting = number;

export type ChatWallpaper = {
  type: "gradient" | "image" | "video";
  value: string; // CSS background for gradient, URL for image/video
  volume: number; // 0-100, only when video
  soundEnabled: boolean;
};

export type Appearance = {
  accentHue: number | null; // 0-360 custom hue override; null = use theme preset
  font: AppFont;
  bubbleStyle: BubbleStyle;
  tickStyle: TickStyle;
  statusOnTop: boolean; // mostra órbitas/status no topo da home (estilo Instagram)
  separateGroups: boolean; // separa grupos em aba própria
  hideName: boolean; // oculta nome do contato no cabeçalho do chat
  hideCallButton: boolean; // oculta botão de chamada
  hideAvatar: boolean; // oculta foto de perfil dentro da conversa
};

type SettingsValue = {
  theme: ThemeAccent;
  setTheme: (t: ThemeAccent) => void;
  privacy: PrivacyFlags;
  setPrivacy: (p: PrivacyFlags) => void;
  ephemeral: Record<string, EphemeralSetting>;
  setEphemeral: (convId: string, seconds: EphemeralSetting) => void;
  locks: Record<string, string>;
  lockChat: (convId: string, pin: string) => void;
  unlockChat: (convId: string) => void;
  isUnlockedNow: (convId: string) => boolean;
  markUnlockedNow: (convId: string) => void;
  // Lobby wallpaper (lista de chats)
  wallpaper: string;
  setWallpaper: (w: string) => void;
  // Chat wallpaper (dentro da conversa)
  chatWallpaper: ChatWallpaper;
  setChatWallpaper: (w: Partial<ChatWallpaper>) => void;
  // Wallpaper por contato/conversa
  contactWallpapers: Record<string, ChatWallpaper>;
  setContactWallpaper: (convId: string, w: ChatWallpaper | null) => void;
  // Personalização extrema (estilo GB/Lite)
  appearance: Appearance;
  setAppearance: (a: Partial<Appearance>) => void;
};

const SettingsCtx = createContext<SettingsValue | undefined>(undefined);
const STORAGE = "cosmos-chat:settings:v3";

const DEFAULT_WALLPAPER = "radial-gradient(circle at 20% 10%, oklch(0.32 0.12 295 / 0.35), transparent 55%), radial-gradient(circle at 80% 90%, oklch(0.32 0.14 230 / 0.35), transparent 50%), oklch(0.12 0.04 280)";

type Persisted = {
  theme: ThemeAccent;
  privacy: PrivacyFlags;
  ephemeral: Record<string, number>;
  locks: Record<string, string>;
  wallpaper: string;
  chatWallpaper: ChatWallpaper;
  contactWallpapers: Record<string, ChatWallpaper>;
  appearance: Appearance;
};

const DEFAULT_APPEARANCE: Appearance = {
  accentHue: null,
  font: "default",
  bubbleStyle: "round",
  tickStyle: "default",
  statusOnTop: false,
  separateGroups: false,
  hideName: false,
  hideCallButton: false,
  hideAvatar: false,
};

const DEFAULTS: Persisted = {
  theme: "cosmos",
  privacy: {
    ghostLastSeen: false, ghostOnline: false, ghostTyping: false, ghostRecording: false,
    antiDelete: true, bypassViewOnce: true,
  },
  ephemeral: {},
  locks: {},
  wallpaper: DEFAULT_WALLPAPER,
  chatWallpaper: { type: "gradient", value: "stars", volume: 30, soundEnabled: false },
  contactWallpapers: {},
  appearance: DEFAULT_APPEARANCE,
};

const FONT_STACKS: Record<AppFont, string> = {
  default: "",
  rounded: "'Comfortaa', 'Quicksand', system-ui, sans-serif",
  serif: "'Georgia', 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
  elegant: "'Playfair Display', Georgia, serif",
  playful: "'Comic Sans MS', 'Comic Neue', cursive",
};

const GOOGLE_FONTS: Partial<Record<AppFont, string>> = {
  rounded: "https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=Quicksand:wght@400;500;700&display=swap",
  mono: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap",
  elegant: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
  playful: "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap",
};

function hashPin(pin: string): string {
  let h = 0;
  for (let i = 0; i < pin.length; i++) h = (h * 31 + pin.charCodeAt(i)) | 0;
  return `s_${h}`;
}

function loadInitial(): Persisted {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      ...DEFAULTS,
      ...parsed,
      chatWallpaper: { ...DEFAULTS.chatWallpaper, ...(parsed.chatWallpaper ?? {}) },
      appearance: { ...DEFAULT_APPEARANCE, ...(parsed.appearance ?? {}) },
      contactWallpapers: parsed.contactWallpapers ?? {},
    };
  } catch { return DEFAULTS; }
}

function ensureFontLink(font: AppFont) {
  if (typeof document === "undefined") return;
  const id = "cosmos-google-font";
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  const href = GOOGLE_FONTS[font];
  if (!href) { existing?.remove(); return; }
  if (existing) { existing.href = href; return; }
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet"; link.href = href;
  document.head.appendChild(link);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(DEFAULTS);
  const [unlockedSession, setUnlockedSession] = useState<Record<string, boolean>>({});

  useEffect(() => { setState(loadInitial()); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (state.theme === "cosmos") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", state.theme);
    html.classList.add("dark");
  }, [state.theme]);

  // Aplica cor de acento personalizada (hue 0-360)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const h = state.appearance.accentHue;
    if (h == null) {
      ["--primary", "--cosmic", "--nebula", "--ring", "--bubble-out", "--accent"].forEach((p) => html.style.removeProperty(p));
      return;
    }
    const nebulaHue = (h + 200) % 360;
    html.style.setProperty("--primary", `oklch(0.6 0.2 ${h})`);
    html.style.setProperty("--cosmic", `oklch(0.6 0.2 ${h})`);
    html.style.setProperty("--nebula", `oklch(0.72 0.16 ${nebulaHue})`);
    html.style.setProperty("--accent", `oklch(0.72 0.16 ${nebulaHue})`);
    html.style.setProperty("--ring", `oklch(0.65 0.2 ${h})`);
    html.style.setProperty("--bubble-out", `oklch(0.45 0.16 ${h} / 0.85)`);
  }, [state.appearance.accentHue]);

  // Aplica fonte e estilo de balão via atributos no <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    ensureFontLink(state.appearance.font);
    const stack = FONT_STACKS[state.appearance.font];
    if (stack) html.style.setProperty("--app-font", stack);
    else html.style.removeProperty("--app-font");
    html.setAttribute("data-bubble", state.appearance.bubbleStyle);
  }, [state.appearance.font, state.appearance.bubbleStyle]);

  const value: SettingsValue = {
    theme: state.theme,
    setTheme: (t) => setState((s) => ({ ...s, theme: t })),
    privacy: state.privacy,
    setPrivacy: (p) => setState((s) => ({ ...s, privacy: p })),
    ephemeral: state.ephemeral,
    setEphemeral: (convId, seconds) =>
      setState((s) => {
        const next = { ...s.ephemeral };
        if (!seconds) delete next[convId]; else next[convId] = seconds;
        return { ...s, ephemeral: next };
      }),
    locks: state.locks,
    lockChat: (convId, pin) => setState((s) => ({ ...s, locks: { ...s.locks, [convId]: hashPin(pin) } })),
    unlockChat: (convId) => setState((s) => {
      const next = { ...s.locks }; delete next[convId]; return { ...s, locks: next };
    }),
    isUnlockedNow: (convId) => !!unlockedSession[convId],
    markUnlockedNow: (convId) => setUnlockedSession((u) => ({ ...u, [convId]: true })),
    wallpaper: state.wallpaper,
    setWallpaper: (w) => setState((s) => ({ ...s, wallpaper: w })),
    chatWallpaper: state.chatWallpaper,
    setChatWallpaper: (w) => setState((s) => ({ ...s, chatWallpaper: { ...s.chatWallpaper, ...w } })),
    contactWallpapers: state.contactWallpapers,
    setContactWallpaper: (convId, w) => setState((s) => {
      const next = { ...s.contactWallpapers };
      if (!w) delete next[convId]; else next[convId] = w;
      return { ...s, contactWallpapers: next };
    }),
    appearance: state.appearance,
    setAppearance: (a) => setState((s) => ({ ...s, appearance: { ...s.appearance, ...a } })),
  };

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings deve estar dentro de SettingsProvider");
  return ctx;
}

export function verifyPin(stored: string, pin: string): boolean {
  return stored === hashPin(pin);
}

export const TICK_GLYPHS: Record<TickStyle, string> = {
  default: "✓✓",
  hearts: "💜",
  alien: "👽",
  stars: "✦✦",
  rockets: "🚀",
};
