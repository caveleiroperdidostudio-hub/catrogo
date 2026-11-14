import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_CHAT_APPEARANCE, normalizeChatAppearance, type ChatAppearance } from "@/lib/chat-appearance";

export type ThemeAccent = "cosmos" | "aurora" | "supernova" | "rose" | "eclipse";
export type AppFont = "default" | "rounded" | "serif";
export type BubbleStyle = ChatAppearance["bubble"];

export type Appearance = {
  accentHue: number | null;
  font: AppFont;
  bubbleStyle: BubbleStyle;
};

type SettingsValue = {
  chatAppearance: ChatAppearance;
  conversationAppearance: Record<string, ChatAppearance>;
  setChatAppearance: (value: ChatAppearance, conversationId?: string) => void;
  resetChatAppearance: (conversationId?: string) => void;
  appearanceProfiles: { name: string; value: ChatAppearance }[];
  saveAppearanceProfile: (name: string, value: ChatAppearance) => void;
  removeAppearanceProfile: (name: string) => void;
  readThrough: Record<string, string>;
  markConversationRead: (conversationId: string, timestamp: string) => void;
  theme: ThemeAccent;
  setTheme: (theme: ThemeAccent) => void;
  locks: Record<string, string>;
  lockChat: (conversationId: string, pin: string) => void;
  unlockChat: (conversationId: string) => void;
  isUnlockedNow: (conversationId: string) => boolean;
  markUnlockedNow: (conversationId: string) => void;
  appearance: Appearance;
  setAppearance: (appearance: Partial<Appearance>) => void;
};

type Persisted = {
  chatAppearance: ChatAppearance;
  conversationAppearance: Record<string, ChatAppearance>;
  appearanceProfiles: { name: string; value: ChatAppearance }[];
  readThrough: Record<string, string>;
  theme: ThemeAccent;
  locks: Record<string, string>;
  appearance: Appearance;
};

const SettingsCtx = createContext<SettingsValue | undefined>(undefined);
const STORAGE = "cosmos-chat:settings:v3";
const DEFAULT_APPEARANCE: Appearance = { accentHue: null, font: "default", bubbleStyle: "round" };
const DEFAULTS: Persisted = {
  chatAppearance: DEFAULT_CHAT_APPEARANCE,
  conversationAppearance: {},
  appearanceProfiles: [],
  readThrough: {},
  theme: "cosmos",
  locks: {},
  appearance: DEFAULT_APPEARANCE,
};

const FONT_STACKS: Record<AppFont, string> = {
  default: "",
  rounded: "'Comfortaa', 'Quicksand', system-ui, sans-serif",
  serif: "'Georgia', 'Times New Roman', serif",
};
const GOOGLE_FONTS: Partial<Record<AppFont, string>> = {
  rounded: "https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=Quicksand:wght@400;500;700&display=swap",
};

function hashPin(pin: string): string {
  let hash = 0;
  for (let index = 0; index < pin.length; index += 1) hash = (hash * 31 + pin.charCodeAt(index)) | 0;
  return `s_${hash}`;
}

function normalizeConversationAppearance(value: unknown): Record<string, ChatAppearance> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, Partial<ChatAppearance>>).map(([id, appearance]) => [id, normalizeChatAppearance(appearance)]),
  );
}

function loadInitial(storage: string): Persisted {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(storage);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const font = parsed.appearance?.font;
    return {
      ...DEFAULTS,
      theme: parsed.theme ?? DEFAULTS.theme,
      locks: parsed.locks ?? {},
      chatAppearance: normalizeChatAppearance(parsed.chatAppearance ?? { bubble: parsed.appearance?.bubbleStyle ?? "round" }),
      conversationAppearance: normalizeConversationAppearance(parsed.conversationAppearance),
      appearanceProfiles: Array.isArray(parsed.appearanceProfiles)
        ? parsed.appearanceProfiles.slice(0, 8).map((profile) => ({ name: profile.name, value: normalizeChatAppearance(profile.value) }))
        : [],
      readThrough: parsed.readThrough ?? {},
      appearance: {
        accentHue: typeof parsed.appearance?.accentHue === "number" ? parsed.appearance.accentHue : null,
        font: font === "rounded" || font === "serif" ? font : "default",
        bubbleStyle: parsed.appearance?.bubbleStyle ?? "round",
      },
    };
  } catch {
    return DEFAULTS;
  }
}

function ensureFontLink(font: AppFont) {
  if (typeof document === "undefined") return;
  const id = "nuv-google-font";
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  const href = GOOGLE_FONTS[font];
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.href = href;
    return;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storage = user ? `${STORAGE}:${user.id}` : null;
  const [loadedStorage, setLoadedStorage] = useState<string | null>(null);
  const [state, setState] = useState<Persisted>(DEFAULTS);
  const [unlockedSession, setUnlockedSession] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (storage && user) {
      try {
        const legacy = localStorage.getItem(STORAGE);
        const owner = localStorage.getItem(`${STORAGE}:owner`);
        if (legacy && (!owner || owner === user.id) && !localStorage.getItem(storage)) {
          localStorage.setItem(`${STORAGE}:owner`, user.id);
          localStorage.setItem(storage, legacy);
        }
      } catch {
        // O app continua utilizável quando o navegador bloqueia armazenamento.
      }
    }
    setState(storage ? loadInitial(storage) : DEFAULTS);
    setUnlockedSession({});
    setLoadedStorage(storage);
  }, [storage, user?.id]);

  useEffect(() => {
    if (!storage || loadedStorage !== storage) return;
    try {
      localStorage.setItem(storage, JSON.stringify(state));
    } catch {
      // As preferências continuam válidas durante a sessão.
    }
  }, [state, storage, loadedStorage]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (state.theme === "cosmos") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", state.theme);
    html.classList.add("dark");
  }, [state.theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const hue = state.appearance.accentHue;
    if (hue == null) {
      ["--primary", "--cosmic", "--nebula", "--ring", "--bubble-out", "--accent"].forEach((property) => html.style.removeProperty(property));
      return;
    }
    html.style.setProperty("--primary", `oklch(0.6 0.2 ${hue})`);
    html.style.setProperty("--cosmic", `oklch(0.6 0.2 ${hue})`);
    html.style.setProperty("--nebula", `oklch(0.72 0.16 ${(hue + 200) % 360})`);
    html.style.setProperty("--accent", `oklch(0.72 0.16 ${(hue + 200) % 360})`);
    html.style.setProperty("--ring", `oklch(0.65 0.2 ${hue})`);
    html.style.setProperty("--bubble-out", `oklch(0.45 0.16 ${hue} / 0.85)`);
  }, [state.appearance.accentHue]);

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
    chatAppearance: state.chatAppearance,
    conversationAppearance: state.conversationAppearance,
    setChatAppearance: (nextAppearance, conversationId) => setState((current) => conversationId
      ? { ...current, conversationAppearance: { ...current.conversationAppearance, [conversationId]: normalizeChatAppearance(nextAppearance) } }
      : {
          ...current,
          chatAppearance: normalizeChatAppearance(nextAppearance),
          appearance: { ...current.appearance, bubbleStyle: nextAppearance.bubble },
        }),
    resetChatAppearance: (conversationId) => setState((current) => {
      if (!conversationId) {
        return { ...current, chatAppearance: DEFAULT_CHAT_APPEARANCE, appearance: { ...current.appearance, bubbleStyle: "round" } };
      }
      const next = { ...current.conversationAppearance };
      delete next[conversationId];
      return { ...current, conversationAppearance: next };
    }),
    appearanceProfiles: state.appearanceProfiles,
    saveAppearanceProfile: (name, nextAppearance) => setState((current) => ({
      ...current,
      appearanceProfiles: [
        ...current.appearanceProfiles.filter((profile) => profile.name !== name),
        { name: name.trim().slice(0, 32), value: normalizeChatAppearance(nextAppearance) },
      ].slice(-8),
    })),
    removeAppearanceProfile: (name) => setState((current) => ({
      ...current,
      appearanceProfiles: current.appearanceProfiles.filter((profile) => profile.name !== name),
    })),
    readThrough: state.readThrough,
    markConversationRead: (conversationId, timestamp) => setState((current) => {
      if ((current.readThrough[conversationId] ?? "") >= timestamp) return current;
      return { ...current, readThrough: { ...current.readThrough, [conversationId]: timestamp } };
    }),
    theme: state.theme,
    setTheme: (theme) => setState((current) => ({ ...current, theme })),
    locks: state.locks,
    lockChat: (conversationId, pin) => setState((current) => ({ ...current, locks: { ...current.locks, [conversationId]: hashPin(pin) } })),
    unlockChat: (conversationId) => setState((current) => {
      const next = { ...current.locks };
      delete next[conversationId];
      return { ...current, locks: next };
    }),
    isUnlockedNow: (conversationId) => !!unlockedSession[conversationId],
    markUnlockedNow: (conversationId) => setUnlockedSession((current) => ({ ...current, [conversationId]: true })),
    appearance: state.appearance,
    setAppearance: (nextAppearance) => setState((current) => ({
      ...current,
      appearance: { ...current.appearance, ...nextAppearance },
      chatAppearance: { ...current.chatAppearance, ...(nextAppearance.bubbleStyle ? { bubble: nextAppearance.bubbleStyle } : {}) },
    })),
  };

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsCtx);
  if (!context) throw new Error("useSettings deve estar dentro de SettingsProvider");
  return context;
}

export function verifyPin(stored: string, pin: string): boolean {
  return stored === hashPin(pin);
}
