import { supabase } from "@/integrations/supabase/client";

export type Bucket = "chat-media" | "stickers" | "movies";

const urlCache = new Map<string, { url: string; exp: number }>();

/** Gera (e cacheia) uma URL assinada para um arquivo em bucket privado. */
export async function signedUrl(bucket: Bucket, path: string, seconds = 60 * 60 * 6): Promise<string | null> {
  const key = `${bucket}:${path}`;
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now() + 30_000) return hit.url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (!data?.signedUrl) return null;
  urlCache.set(key, { url: data.signedUrl, exp: Date.now() + seconds * 1000 });
  return data.signedUrl;
}

const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-80);

/** Envia um arquivo do usuário para um bucket privado e devolve o caminho. */
export async function uploadFile(bucket: Bucket, userId: string, file: Blob, name: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${safeName(name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: (file as File).type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Descobre o tipo de mensagem a partir do MIME. */
export function mediaKind(mime: string): "image" | "video" | "audio" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Converte um dataURL (ex: imagem gerada pela IA) em Blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Recorta/redimensiona uma imagem para 512x512 transparente (padrão figurinha). */
export async function toStickerBlob(src: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(src);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? src), "image/png"));
}
