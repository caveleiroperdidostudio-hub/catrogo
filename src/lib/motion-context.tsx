import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_MOTION, deleteMedia, getMedia, INTENSITY_INFO, kindOfFile, loadMotion, putMedia, saveMotion,
  type CustomAnimation, type MotionKind, type MotionPersisted, type MotionPrefs, type MotionSlot,
} from "@/lib/app-motion";

type PlayItem = {
  uid: string;
  kind: MotionKind;
  url: string;
  volume: number;
  opacity: number;
};

type Ctx = {
  prefs: MotionPrefs;
  setPrefs: (patch: Partial<MotionPrefs>) => void;
  animations: CustomAnimation[];
  addAnimation: (input: { file: File; slot: MotionSlot; name?: string }) => Promise<void>;
  updateAnimation: (id: string, patch: Partial<Omit<CustomAnimation, "id" | "mediaKey">>) => void;
  removeAnimation: (id: string) => Promise<void>;
  play: (slot: MotionSlot) => void;
  preview: (animation: CustomAnimation) => void;
};

const MotionCtx = createContext<Ctx | undefined>(undefined);

export function MotionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<MotionPersisted>({ prefs: DEFAULT_MOTION, animations: [] });
  const [items, setItems] = useState<PlayItem[]>([]);
  const loadedFor = useRef<string | null>(null);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    setItems([]);
    setState(loadMotion(userId));
  }, [userId]);

  useEffect(() => {
    if (loadedFor.current !== userId) return;
    saveMotion(userId, state);
  }, [state, userId]);

  // O CSS usa estes atributos para animar (ou parar) a interface inteira.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.motion = state.prefs.enabled ? "on" : "off";
    root.dataset.motionIntensity = state.prefs.intensity;
    root.style.setProperty("--motion-speed", INTENSITY_INFO[state.prefs.intensity].speed);
  }, [state.prefs.enabled, state.prefs.intensity]);

  const drop = useCallback((uid: string) => {
    const timer = timers.current[uid];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[uid];
    }
    setItems((list) => {
      const item = list.find((i) => i.uid === uid);
      if (item) URL.revokeObjectURL(item.url);
      return list.filter((i) => i.uid !== uid);
    });
  }, []);

  const enqueue = useCallback((animation: CustomAnimation) => {
    void getMedia(animation.mediaKey).then((blob) => {
      if (!blob) return;
      const uid = `${animation.id}:${Date.now()}`;
      const url = URL.createObjectURL(blob);
      setItems((list) => [...list.slice(-2), { uid, kind: animation.kind, url, volume: animation.volume, opacity: animation.opacity }]);
      // Rede de segurança: um vídeo travado não pode segurar a camada para sempre.
      timers.current[uid] = window.setTimeout(() => drop(uid), animation.kind === "image" ? 2800 : 16000);
    });
  }, [drop]);

  const play = useCallback((slot: MotionSlot) => {
    if (!state.prefs.enabled) return;
    state.animations.filter((a) => a.slot === slot).forEach(enqueue);
  }, [enqueue, state.animations, state.prefs.enabled]);

  const preview = useCallback((animation: CustomAnimation) => {
    enqueue(animation);
  }, [enqueue]);

  const setPrefs = useCallback((patch: Partial<MotionPrefs>) => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  }, []);

  const addAnimation = useCallback<Ctx["addAnimation"]>(async ({ file, slot, name }) => {
    const kind = kindOfFile(file);
    if (!kind) throw new Error("Escolha um vídeo, uma foto ou um som.");
    if (file.size > 40 * 1024 * 1024) throw new Error("Arquivo muito grande (limite de 40 MB).");
    const id = `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const mediaKey = `${userId ?? "anon"}:${id}`;
    await putMedia(mediaKey, file);
    setState((s) => ({
      ...s,
      // Uma animação ativa por momento: a nova substitui a anterior daquele slot.
      animations: [
        ...s.animations.filter((a) => a.slot !== slot),
        {
          id,
          name: (name?.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 40),
          slot,
          kind,
          mediaKey,
          volume: kind === "sound" ? 70 : kind === "video" ? 30 : 0,
          opacity: 100,
        },
      ],
    }));
  }, [userId]);

  const updateAnimation = useCallback<Ctx["updateAnimation"]>((id, patch) => {
    setState((s) => ({
      ...s,
      animations: s.animations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const removeAnimation = useCallback<Ctx["removeAnimation"]>(async (id) => {
    const target = state.animations.find((a) => a.id === id);
    if (target) await deleteMedia(target.mediaKey);
    setState((s) => ({ ...s, animations: s.animations.filter((a) => a.id !== id) }));
  }, [state.animations]);

  const value = useMemo<Ctx>(
    () => ({
      prefs: state.prefs, setPrefs, animations: state.animations,
      addAnimation, updateAnimation, removeAnimation, play, preview,
    }),
    [state.prefs, state.animations, setPrefs, addAnimation, updateAnimation, removeAnimation, play, preview],
  );

  return (
    <MotionCtx.Provider value={value}>
      {children}
      {items.map((item) => (
        <div
          key={item.uid}
          className="motion-overlay"
          style={{ opacity: item.opacity / 100 }}
          aria-hidden="true"
        >
          {item.kind === "video" && (
            <video
              src={item.url}
              autoPlay
              playsInline
              muted={item.volume === 0}
              className="h-full w-full object-cover"
              onEnded={() => drop(item.uid)}
              onError={() => drop(item.uid)}
              ref={(el) => {
                if (el) el.volume = Math.min(1, Math.max(0, item.volume / 100));
              }}
            />
          )}
          {item.kind === "image" && (
            <img src={item.url} alt="" className="h-full w-full object-cover" onError={() => drop(item.uid)} />
          )}
          {item.kind === "sound" && (
            <audio
              src={item.url}
              autoPlay
              onEnded={() => drop(item.uid)}
              onError={() => drop(item.uid)}
              ref={(el) => {
                if (el) {
                  el.volume = Math.min(1, Math.max(0, (item.volume || 70) / 100));
                  void el.play().catch(() => {
                    /* navegador bloqueou o áudio automático */
                  });
                }
              }}
            />
          )}
        </div>
      ))}
    </MotionCtx.Provider>
  );
}

export function useMotion() {
  const ctx = useContext(MotionCtx);
  if (!ctx) throw new Error("useMotion precisa estar dentro de MotionProvider");
  return ctx;
}
