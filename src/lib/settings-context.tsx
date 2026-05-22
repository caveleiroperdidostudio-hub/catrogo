import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeAccent = "cosmos" | "aurora" | "supernova" | "rose" | "eclipse";

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
};

const SettingsCtx = createContext<SettingsValue | undefined>(undefined);
const STORAGE = "cosmos-chat:settings:v2";

const DEFAULT_WALLPAPER = "radial-gradient(circle at 20% 10%, oklch(0.32 0.12 295 / 0.35), transparent 55%), radial-gradient(circle at 80% 90%, oklch(0.32 0.14 230 / 0.35), transparent 50%), oklch(0.12 0.04 280)";

type Persisted = {
  theme: ThemeAccent;
  privacy: PrivacyFlags;
  ephemeral: Record<string, number>;
  locks: Record<string, string>;
  wallpaper: string;
  chatWallpaper: ChatWallpaper;
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
    return { ...DEFAULTS, ...parsed, chatWallpaper: { ...DEFAULTS.chatWallpaper, ...(parsed.chatWallpaper ?? {}) } };
  } catch { return DEFAULTS; }
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
