import { supabase } from "@/integrations/supabase/client";

export type Rarity = "comum" | "raro" | "epico" | "lendario";
export type ItemKind = "skin" | "badge" | "efeito";

export type StoreItem = {
  id: string;
  name: string;
  description: string | null;
  kind: ItemKind;
  rarity: Rarity;
  price: number;
  attributes: Record<string, unknown>;
  min_subscribers: number;
  active: boolean;
  created_at: string;
};

export type CoinTransaction = {
  id: string;
  amount: number;
  kind: string;
  reference: string | null;
  created_at: string;
};

export const RARITY_LABEL: Record<Rarity, string> = {
  comum: "Comum",
  raro: "Raro",
  epico: "Épico",
  lendario: "Lendário",
};

export const RARITY_COLOR: Record<Rarity, string> = {
  comum: "text-muted-foreground border-white/15",
  raro: "text-sky-400 border-sky-500/40",
  epico: "text-fuchsia-400 border-fuchsia-500/40",
  lendario: "text-amber-400 border-amber-500/50",
};

export const HYPE_AMOUNTS = [5, 10, 50] as const;

/** Custos em hypes (CatCoins) das operações com jogos. */
export const GAME_COSTS = {
  export: 15,
  publish: 10,
  import: 20,
} as const;

export const TX_LABEL: Record<string, { label: string; emoji: string }> = {
  buy_item: { label: "Compra na loja", emoji: "🛍️" },
  buy_game: { label: "Compra de jogo", emoji: "🎮" },
  hype_sent: { label: "Hype enviado", emoji: "⚡" },
  hype_received: { label: "Hype recebido", emoji: "💰" },
  reward: { label: "Recompensa", emoji: "🎁" },
  daily: { label: "Bônus diário", emoji: "📅" },
  bonus: { label: "Bônus", emoji: "✨" },
  export_game: { label: "Exportação de jogo", emoji: "📦" },
  publish_game: { label: "Publicação no CatroGo", emoji: "🚀" },
  import_game: { label: "Importação de jogo", emoji: "📥" },
};


export function txLabel(kind: string) {
  return TX_LABEL[kind] ?? { label: kind.replace(/_/g, " "), emoji: "🪙" };
}

/* ---------------- Wallet ---------------- */

export async function getBalance(userId: string): Promise<number> {
  const { data } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
  return data?.balance ?? 0;
}

export async function listTransactions(): Promise<CoinTransaction[]> {
  const { data } = await supabase
    .from("coin_transactions")
    .select("id, amount, kind, reference, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as CoinTransaction[];
}

/* ---------------- Store ---------------- */

export async function listStoreItems(): Promise<StoreItem[]> {
  const { data, error } = await supabase
    .from("store_items")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoreItem[];
}

export async function listOwnedItemIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("user_items").select("item_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.item_id as string));
}

export async function buyStoreItem(itemId: string): Promise<number> {
  const { data, error } = await supabase.rpc("buy_store_item", { _item_id: itemId });
  if (error) throw new Error(error.message);
  return (data as { balance: number }).balance;
}

/* ---------------- Inventory / equip ---------------- */

export type OwnedItem = StoreItem & { equipped: boolean };

export async function listInventory(userId: string): Promise<OwnedItem[]> {
  const { data } = await supabase
    .from("user_items")
    .select("equipped, store_items(*)")
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });
  return (data ?? []).map((r) => ({ ...(r.store_items as StoreItem), equipped: r.equipped as boolean }));
}

export async function equipItem(userId: string, itemId: string, kind: ItemKind) {
  // only one equipped per kind: unequip same-kind items first
  const { data: owned } = await supabase
    .from("user_items")
    .select("item_id, store_items(kind)")
    .eq("user_id", userId);
  const sameKind = (owned ?? []).filter((r) => (r.store_items as { kind: string }).kind === kind).map((r) => r.item_id);
  if (sameKind.length) {
    await supabase.from("user_items").update({ equipped: false }).eq("user_id", userId).in("item_id", sameKind);
  }
  await supabase.from("user_items").update({ equipped: true }).eq("user_id", userId).eq("item_id", itemId);
}

/* ---------------- Hype + game purchase ---------------- */

/** Cobra hypes por uma operação com jogos (exportar, publicar ou importar). */
export async function spendCoins(
  amount: number,
  kind: "export_game" | "publish_game" | "import_game",
  reference?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("spend_coins", {
    _amount: amount,
    _kind: kind,
    _reference: reference,
  });
  if (error) throw new Error(error.message);
  return (data as { balance: number }).balance;
}


export async function sendHype(videoId: string, amount: number): Promise<number> {
  const { data, error } = await supabase.rpc("send_hype", { _video_id: videoId, _amount: amount });
  if (error) throw new Error(error.message);
  return (data as { balance: number }).balance;
}

export async function buyGame(gameId: string): Promise<number> {
  const { data, error } = await supabase.rpc("buy_game", { _game_id: gameId });
  if (error) throw new Error(error.message);
  return (data as { balance: number }).balance;
}

export async function listOwnedGameIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("game_purchases").select("game_id").eq("buyer_id", userId);
  return new Set((data ?? []).map((r) => r.game_id as string));
}

/* ---------------- Creator level ---------------- */

export function creatorLevel(coins: number, subscribers: number): { level: number; label: string; next: number; progress: number } {
  const xp = coins + subscribers * 25;
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 80)) + 1);
  const labels = ["Iniciante", "Aprendiz", "Criador", "Veterano", "Mestre", "Lenda"];
  const label = labels[Math.min(level - 1, labels.length - 1)];
  const curBase = Math.pow(level - 1, 2) * 80;
  const nextBase = Math.pow(level, 2) * 80;
  const progress = Math.min(1, Math.max(0, (xp - curBase) / (nextBase - curBase)));
  return { level, label, next: nextBase, progress };
}
