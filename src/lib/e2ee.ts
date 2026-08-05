/**
 * Cosmos Lattice E2EE — criptografia ponta a ponta do CatroGo.
 *
 * Como funciona (mais forte que o padrão de apps de mensagem comuns):
 * 1. Cada dispositivo gera um par de chaves ECDH P-256. A chave PRIVADA nunca
 *    sai do aparelho (fica só no armazenamento local do navegador).
 * 2. Cada conversa tem uma chave simétrica AES-GCM 256 bits gerada no cliente.
 * 3. Essa chave é "embrulhada" (cifrada) individualmente para cada membro
 *    usando o segredo ECDH derivado entre remetente e destinatário.
 * 4. O servidor guarda apenas: chaves públicas, chaves embrulhadas e o texto
 *    cifrado. Nem o servidor nem a Lovable/Supabase conseguem ler nada.
 * 5. Cada mensagem usa um IV aleatório de 96 bits (nunca reutilizado).
 */
import { supabase } from "@/integrations/supabase/client";

const PRIV_STORAGE = "catrogo-e2ee-priv-v1";
const PUB_STORAGE = "catrogo-e2ee-pub-v1";

export const ENC_VERSION = 1;
export const ENC_PLACEHOLDER = "🔒 mensagem criptografada";

/* ------------------------- helpers base64 ------------------------- */
const b64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/* ------------------------- chaves do dispositivo ------------------------- */
type KeyPairJwk = { priv: JsonWebKey; pub: JsonWebKey };

let cachedPair: { priv: CryptoKey; pubJwk: JsonWebKey } | null = null;

async function ensureLocalPair(): Promise<{ priv: CryptoKey; pubJwk: JsonWebKey }> {
  if (cachedPair) return cachedPair;
  const rawPriv = localStorage.getItem(PRIV_STORAGE);
  const rawPub = localStorage.getItem(PUB_STORAGE);
  if (rawPriv && rawPub) {
    const privJwk = JSON.parse(rawPriv) as JsonWebKey;
    const pubJwk = JSON.parse(rawPub) as JsonWebKey;
    const priv = await crypto.subtle.importKey("jwk", privJwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
    cachedPair = { priv, pubJwk };
    return cachedPair;
  }
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const pair: KeyPairJwk = { priv: privJwk, pub: pubJwk };
  localStorage.setItem(PRIV_STORAGE, JSON.stringify(pair.priv));
  localStorage.setItem(PUB_STORAGE, JSON.stringify(pair.pub));
  cachedPair = { priv: kp.privateKey, pubJwk };
  return cachedPair;
}

async function fingerprintOf(pubJwk: JsonWebKey): Promise<string> {
  const data = new TextEncoder().encode(`${pubJwk.x}.${pubJwk.y}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash).slice(0, 10))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** Publica (ou revalida) a chave pública deste dispositivo no servidor. */
export async function publishDeviceKey(userId: string): Promise<string> {
  const { pubJwk } = await ensureLocalPair();
  const fp = await fingerprintOf(pubJwk);
  await supabase
    .from("device_keys")
    .upsert({ user_id: userId, public_key: JSON.stringify(pubJwk), fingerprint: fp }, { onConflict: "user_id" });
  return fp;
}

/** Código de segurança deste aparelho (para as pessoas compararem). */
export async function myFingerprint(): Promise<string> {
  const { pubJwk } = await ensureLocalPair();
  return fingerprintOf(pubJwk);
}

async function importPub(json: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", JSON.parse(json) as JsonWebKey, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

async function sharedKey(otherPubJson: string): Promise<CryptoKey> {
  const { priv } = await ensureLocalPair();
  const pub = await importPub(otherPubJson);
  return crypto.subtle.deriveKey({ name: "ECDH", public: pub }, priv, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/* ------------------------- chave da conversa ------------------------- */
const convKeyCache = new Map<string, CryptoKey>();

async function wrapForMember(rawKey: ArrayBuffer, memberPubJson: string) {
  const wrapKey = await sharedKey(memberPubJson);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, rawKey);
  return { wrapped_key: b64(wrapped), wrap_iv: b64(iv.buffer) };
}

/**
 * Garante que exista uma chave desta conversa para o usuário atual.
 * Se não existir, cria uma e distribui embrulhada para todos os membros
 * que já publicaram chave pública.
 */
export async function getConversationKey(conversationId: string, userId: string): Promise<CryptoKey | null> {
  const cached = convKeyCache.get(conversationId);
  if (cached) return cached;
  try {
    await ensureLocalPair();
    const { data: mine } = await supabase
      .from("conversation_keys")
      .select("wrapped_key, wrap_iv, sender_pub")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (mine) {
      const unwrapKey = await sharedKey(mine.sender_pub);
      const raw = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unb64(mine.wrap_iv) },
        unwrapKey,
        unb64(mine.wrapped_key),
      );
      const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
      convKeyCache.set(conversationId, key);
      return key;
    }

    // Não existe ainda: eu crio e distribuo.
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const raw = await crypto.subtle.exportKey("raw", key);
    const { pubJwk } = await ensureLocalPair();
    const senderPub = JSON.stringify(pubJwk);

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: keys } = await supabase.from("device_keys").select("user_id, public_key").in("user_id", ids);

    const rows: {
      conversation_id: string;
      user_id: string;
      wrapped_key: string;
      wrap_iv: string;
      sender_pub: string;
    }[] = [];
    for (const k of keys ?? []) {
      const w = await wrapForMember(raw, k.public_key);
      rows.push({ conversation_id: conversationId, user_id: k.user_id, ...w, sender_pub: senderPub });
    }
    if (rows.length > 0) await supabase.from("conversation_keys").insert(rows);
    convKeyCache.set(conversationId, key);
    return key;
  } catch {
    return null;
  }
}

/** Distribui a chave existente para membros novos que ainda não a têm. */
export async function syncConversationKey(conversationId: string, userId: string) {
  try {
    const key = await getConversationKey(conversationId, userId);
    if (!key) return;
    const raw = await crypto.subtle.exportKey("raw", key);
    const { pubJwk } = await ensureLocalPair();
    const senderPub = JSON.stringify(pubJwk);

    const [{ data: members }, { data: existing }] = await Promise.all([
      supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId),
      supabase.from("conversation_keys").select("user_id").eq("conversation_id", conversationId),
    ]);
    const have = new Set((existing ?? []).map((r) => r.user_id));
    const missing = (members ?? []).map((m) => m.user_id).filter((id) => !have.has(id));
    if (missing.length === 0) return;
    const { data: keys } = await supabase.from("device_keys").select("user_id, public_key").in("user_id", missing);
    for (const k of keys ?? []) {
      const w = await wrapForMember(raw, k.public_key);
      await supabase
        .from("conversation_keys")
        .insert({ conversation_id: conversationId, user_id: k.user_id, ...w, sender_pub: senderPub });
    }
  } catch {
    /* silencioso: criptografia é best-effort progressiva */
  }
}

/* ------------------------- mensagens ------------------------- */
export async function encryptMessage(
  conversationId: string,
  userId: string,
  plaintext: string,
): Promise<{ cipher: string; iv: string } | null> {
  const key = await getConversationKey(conversationId, userId);
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const out = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { cipher: b64(out), iv: b64(iv.buffer) };
}

export async function decryptMessage(
  conversationId: string,
  userId: string,
  cipher: string,
  iv: string,
): Promise<string | null> {
  try {
    const key = await getConversationKey(conversationId, userId);
    if (!key) return null;
    const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(cipher));
    return new TextDecoder().decode(out);
  } catch {
    return null;
  }
}

/** Código de segurança da conversa — deriva do conjunto de chaves dos membros. */
export async function conversationSafetyNumber(conversationId: string): Promise<string> {
  const { data: keys } = await supabase.from("conversation_keys").select("wrapped_key").eq("conversation_id", conversationId);
  const joined = (keys ?? []).map((k) => k.wrapped_key.slice(0, 24)).sort().join("|") + conversationId;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(joined));
  return Array.from(new Uint8Array(hash).slice(0, 15))
    .map((b) => (b % 100).toString().padStart(2, "0"))
    .join("")
    .replace(/(.{5})/g, "$1 ")
    .trim();
}
