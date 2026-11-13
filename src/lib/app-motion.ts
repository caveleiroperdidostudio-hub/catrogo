/**
 * Animações personalizadas do Nuv.
 *
 * Tudo fica no próprio aparelho: a configuração em localStorage (por conta) e
 * os arquivos (vídeo, foto, som) num banco IndexedDB. Nada é enviado ao
 * servidor, então cada pessoa só vê as animações que ela mesma editou.
 */

export type MotionSlot = "app_open" | "tab_change" | "message_sent";

export type MotionKind = "video" | "image" | "sound";

export type MotionIntensity = "calm" | "normal" | "vivid";

export type CustomAnimation = {
  id: string;
  name: string;
  slot: MotionSlot;
  kind: MotionKind;
  mediaKey: string;
  /** 0-100 — volume do vídeo/som */
  volume: number;
  /** 0-100 — opacidade da sobreposição de vídeo/foto */
  opacity: number;
};

export type MotionPrefs = {
  enabled: boolean;
  intensity: MotionIntensity;
};

export const SLOT_INFO: Record<MotionSlot, { label: string; desc: string }> = {
  app_open: { label: "Ao abrir o app", desc: "Toca assim que você entra na sua conta" },
  tab_change: { label: "Ao trocar de aba", desc: "Toca ao ir para outra área do app" },
  message_sent: { label: "Ao enviar mensagem", desc: "Toca quando uma mensagem sai" },
};

export const MOTION_SLOTS: MotionSlot[] = ["app_open", "tab_change", "message_sent"];

export const INTENSITY_INFO: Record<MotionIntensity, { label: string; desc: string; speed: string }> = {
  calm: { label: "Suave", desc: "Movimentos longos e discretos", speed: "1.35" },
  normal: { label: "Normal", desc: "Equilíbrio entre vida e calma", speed: "1" },
  vivid: { label: "Viva", desc: "Rápida e com mais movimento", speed: "0.72" },
};

export const DEFAULT_MOTION: MotionPrefs = { enabled: true, intensity: "normal" };

export const KIND_LABEL: Record<MotionKind, string> = {
  video: "Vídeo",
  image: "Foto",
  sound: "Som",
};

export function kindOfFile(file: File): MotionKind | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "sound";
  return null;
}

export function motionStorageKey(userId: string) {
  return `nuv:motion:${userId}`;
}

export type MotionPersisted = { prefs: MotionPrefs; animations: CustomAnimation[] };

export function loadMotion(userId: string | null): MotionPersisted {
  if (typeof window === "undefined" || !userId) return { prefs: DEFAULT_MOTION, animations: [] };
  try {
    const raw = localStorage.getItem(motionStorageKey(userId));
    if (!raw) return { prefs: DEFAULT_MOTION, animations: [] };
    const parsed = JSON.parse(raw) as Partial<MotionPersisted>;
    return {
      prefs: { ...DEFAULT_MOTION, ...(parsed.prefs ?? {}) },
      animations: Array.isArray(parsed.animations) ? parsed.animations : [],
    };
  } catch {
    return { prefs: DEFAULT_MOTION, animations: [] };
  }
}

export function saveMotion(userId: string | null, value: MotionPersisted) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(motionStorageKey(userId), JSON.stringify(value));
  } catch {
    /* armazenamento cheio: mantém a sessão atual funcionando */
  }
}

/* ---------------- Arquivos (IndexedDB) ---------------- */

const DB_NAME = "nuv-motion-media";
const STORE = "media";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Armazenamento local indisponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Não foi possível abrir o armazenamento"));
  });
}

export async function putMedia(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Não foi possível salvar o arquivo"));
  });
  db.close();
}

export async function getMedia(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("Não foi possível ler o arquivo"));
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function deleteMedia(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    /* nada a limpar */
  }
}
