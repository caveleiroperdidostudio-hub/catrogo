import { useEffect, useState } from "react";
import { Loader2, Coins, ShoppingBag, Sparkles, Check, Lock, Backpack, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@/lib/wallet-context";
import {
  listStoreItems,
  listOwnedItemIds,
  buyStoreItem,
  listInventory,
  equipItem,
  listTransactions,
  txLabel,
  RARITY_LABEL,
  RARITY_COLOR,
  type StoreItem,
  type OwnedItem,
  type CoinTransaction,
} from "@/lib/economy";
import { getFollowStats } from "@/lib/ugc";

const KIND_EMOJI: Record<string, string> = { skin: "🎨", badge: "🏷️", efeito: "✨" };

export function StoreModule() {
  const { user, isOwner } = useAuth();
  const { balance, setBalance } = useWallet();
  const balanceLabel = isOwner ? "∞" : balance;
  const [tab, setTab] = useState<"loja" | "inventario" | "carteira">("loja");
  const [items, setItems] = useState<StoreItem[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [subs, setSubs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [its, own, inv, stats, txs] = await Promise.all([
        listStoreItems(),
        listOwnedItemIds(user.id),
        listInventory(user.id),
        getFollowStats(user.id),
        listTransactions(),
      ]);
      setItems(its);
      setOwned(own);
      setInventory(inv);
      setSubs(stats.followers);
      setTransactions(txs);
    } catch {
      toast.error("Erro ao carregar a loja");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load();
    const t = setInterval(() => listStoreItems().then(setItems).catch(() => {}), 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleBuy = async (item: StoreItem) => {
    if (!user) return;
    setBusyId(item.id);
    try {
      const newBal = await buyStoreItem(item.id);
      setBalance(newBal);
      toast.success(`"${item.name}" comprado! 🎉`);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível comprar");
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (item: OwnedItem) => {
    if (!user) return;
    await equipItem(user.id, item.id, item.kind);
    toast.success(`"${item.name}" equipado`);
    load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-white/5">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <span className="font-semibold flex-1">Loja Catrogo</span>
        <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 px-3 py-1 text-sm font-semibold">
          <Coins className="h-4 w-4" /> {balanceLabel}
        </span>
      </div>

      <div className="flex border-b border-white/5">
        {(["loja", "inventario", "carteira"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            {t === "loja" ? <Sparkles className="h-4 w-4" /> : t === "inventario" ? <Backpack className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            {t === "loja" ? "Loja" : t === "inventario" ? "Meus itens" : "Carteira"}
          </button>
        ))}
      </div>


      {loading ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tab === "loja" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> A IA gera novos itens a cada 2 minutos. Volte sempre para ver raridades novas!
          </p>
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">A loja está abastecendo… volte em instantes.</p>
          ) : (
            items.map((item) => {
              const isOwned = owned.has(item.id);
              const locked = subs < item.min_subscribers;
              return (
                <div key={item.id} className={`rounded-2xl border ${RARITY_COLOR[item.rarity]} bg-white/[0.03] p-4`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{KIND_EMOJI[item.kind] ?? "🎁"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{item.name}</h3>
                        <span className={`text-[10px] uppercase font-bold ${RARITY_COLOR[item.rarity].split(" ")[0]}`}>{RARITY_LABEL[item.rarity]}</span>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      {item.min_subscribers > 0 && (
                        <p className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1"><Lock className="h-3 w-3" /> Requer {item.min_subscribers} inscritos</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold text-sm"><Coins className="h-4 w-4" /> {item.price}</span>
                    {isOwned ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Adquirido</span>
                    ) : (
                      <Button size="sm" disabled={busyId === item.id || locked || (!isOwner && balance < item.price)} onClick={() => handleBuy(item)}>
                        {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comprar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div className="h-2" />
        </div>
      ) : tab === "inventario" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {inventory.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Você ainda não tem itens. Compre na loja!</p>
          ) : (
            inventory.map((item) => (
              <div key={item.id} className={`rounded-2xl border ${RARITY_COLOR[item.rarity]} bg-white/[0.03] p-4 flex items-center gap-3`}>
                <div className="text-2xl">{KIND_EMOJI[item.kind] ?? "🎁"}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  <span className={`text-[10px] uppercase font-bold ${RARITY_COLOR[item.rarity].split(" ")[0]}`}>{RARITY_LABEL[item.rarity]}</span>
                </div>
                {item.equipped ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Equipado</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleEquip(item)}>Equipar</Button>
                )}
              </div>
            ))
          )}
          <div className="h-2" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-fuchsia-500/10 p-5 text-center">
            <p className="text-xs text-amber-300/80 flex items-center justify-center gap-1"><Wallet className="h-3.5 w-3.5" /> Saldo atual</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-3xl font-bold text-amber-400">
              <Coins className="h-7 w-7" /> {balanceLabel}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">CatCoins — use para comprar itens, jogos e dar hype</p>
          </div>
          <p className="text-xs text-muted-foreground pt-1">Histórico de transações</p>
          {transactions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhuma transação ainda.</p>
          ) : (
            transactions.map((tx) => {
              const meta = txLabel(tx.kind);
              const positive = tx.amount > 0;
              return (
                <div key={tx.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3">
                  <div className="text-xl">{meta.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                    {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {positive ? "+" : ""}{tx.amount}
                  </span>
                </div>
              );
            })
          )}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
