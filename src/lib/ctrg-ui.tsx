import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type UiMode = "STANDARD" | "PRO";
export type SkinId = "cosmos" | "glass";

export type CtrgUiInfo = {
  name: string;
  ui_version: string;
  app_version: string;
  kind: "standard" | "pro";
  ui_mode: UiMode;
  pro_available: boolean;
};

export type UiPrefs = {
  ui_mode: UiMode;
  skin: string;
  density: "compact" | "comfortable" | "spacious";
  animations: boolean;
  effects: boolean;
  element_scale: number;
  language: string;
  color_scheme: "dark" | "light";
};

const DEFAULT_PREFS: UiPrefs = {
  ui_mode: "STANDARD",
  skin: "cosmos",
  density: "comfortable",
  animations: true,
  effects: true,
  element_scale: 1,
  language: "pt-BR",
  color_scheme: "dark",
};

const DEFAULT_INFO: CtrgUiInfo = {
  name: "Ctrg UI",
  ui_version: "4.1",
  app_version: "4.1.0",
  kind: "standard",
  ui_mode: "STANDARD",
  pro_available: false,
};

type Ctx = {
  info: CtrgUiInfo;
  prefs: UiPrefs;
  flags: Record<string, boolean>;
  loading: boolean;
  /** Usuário tem o Ctrg OS (assinatura, dono ou administrador). */
  isPro: boolean;
  isOs: boolean;
  savePrefs: (patch: Partial<UiPrefs>) => Promise<void>;
  refresh: () => Promise<void>;
};

const CtrgUiContext = createContext<Ctx | undefined>(undefined);

export const APP_VERSION = "4.1.0";

export function CtrgUiProvider({ children }: { children: ReactNode }) {
  const { session, isOwner } = useAuth();
  const userId = session?.user?.id ?? null;
  const [info, setInfo] = useState<CtrgUiInfo>(DEFAULT_INFO);
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_PREFS);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: flagRows } = await supabase.from("feature_flags").select("key, enabled");
    if (flagRows) setFlags(Object.fromEntries(flagRows.map((f) => [f.key, f.enabled])));

    if (!userId) {
      setLoading(false);
      return;
    }

    const [{ data: prefRow }, { data: rpc }, { data: staff }] = await Promise.all([
      supabase
        .from("ui_user_preferences")
        .select("ui_mode, skin, density, animations, effects, element_scale, language, color_scheme")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("current_ui_version"),
      supabase.rpc("is_staff"),
    ]);

    if (prefRow) setPrefs({ ...DEFAULT_PREFS, ...(prefRow as Partial<UiPrefs>) });
    if (rpc) setInfo({ ...DEFAULT_INFO, ...(rpc as unknown as CtrgUiInfo) });
    setIsStaff(staff === true);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrefs = useCallback(
    async (patch: Partial<UiPrefs>) => {
      setPrefs((p) => ({ ...p, ...patch }));
      if (!userId) return;
      await supabase.from("ui_user_preferences").upsert({ user_id: userId, ...prefs, ...patch });
      const { data: rpc } = await supabase.rpc("current_ui_version");
      if (rpc) setInfo({ ...DEFAULT_INFO, ...(rpc as unknown as CtrgUiInfo) });
    },
    [prefs, userId],
  );

  // Dono e administradores recebem o Ctrg OS de graça; o resto desbloqueia pela assinatura.
  const isOs = (info.ui_mode === "PRO" && info.kind === "pro") || isOwner || isStaff;
  const proActive = isOs && prefs.ui_mode === "PRO";

  // aplica tokens da Ctrg UI no documento
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.ctrgUi = info.ui_version;
    root.dataset.ctrgMode = proActive ? "pro" : "standard";
    root.dataset.ctrgSkin = isOs && prefs.skin === "glass" ? "glass" : "cosmos";
    root.dataset.density = prefs.density;
    root.dataset.animations = prefs.animations ? "on" : "off";
    root.dataset.effects = prefs.effects ? "on" : "off";
    root.style.setProperty("--ctrg-scale", String(prefs.element_scale));
  }, [info.ui_version, proActive, isOs, prefs.skin, prefs.animations, prefs.density, prefs.effects, prefs.element_scale]);

  const value = useMemo<Ctx>(
    () => ({
      info,
      prefs,
      flags,
      loading,
      isPro: isOs,
      isOs,
      savePrefs,
      refresh: load,
    }),
    [info, prefs, flags, loading, isOs, savePrefs, load],
  );

  return <CtrgUiContext.Provider value={value}>{children}</CtrgUiContext.Provider>;
}

export function useCtrgUi() {
  const ctx = useContext(CtrgUiContext);
  if (!ctx) throw new Error("useCtrgUi precisa estar dentro de CtrgUiProvider");
  return ctx;
}

/** Nome da experiência: Ctrg UI (gratuita) ou Ctrg OS (paga). */
export function uiLabel(info: CtrgUiInfo) {
  return `${info.kind === "pro" ? "Ctrg OS" : "Ctrg UI"} ${info.ui_version}`;
}
