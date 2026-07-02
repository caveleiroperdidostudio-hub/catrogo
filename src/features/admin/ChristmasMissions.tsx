import { useEffect, useState } from "react";
import { Gift, Loader2, Check, Coins, Package, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@/lib/wallet-context";
import { useGlobalEvent, claimEventReward, listCompletedMissions, formatCountdown } from "@/lib/events-context";
import { CHRISTMAS_MISSIONS } from "@/lib/christmas";

export function ChristmasMissions() {
  const { isOwner } = useAuth();
  const { event, remainingMs } = useGlobalEvent();
  const { balance, setBalance } = useWallet();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    listCompletedMissions(event.id)
      .then(setDone)
      .finally(() => setLoading(false));
  }, [event]);

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const claim = async (key: string, coins: number, grants: boolean, cost?: number) => {
    if (cost && !isOwner && balance < cost) return toast.error("Saldo insuficiente para este pacote");
    setBusy(key);
    try {
      // pacote pago: cobra o custo (recompensa líquida = coins - cost)
      const net = cost ? coins - cost : coins;
      const bal = await claimEventReward(event.id, key, net, grants);
      setBalance(bal);
      setDone((s) => new Set(s).add(key));
      toast.success(grants ? "Mod Exclusivo de Natal desbloqueado! 🎄" : "Recompensa resgatada! 🎁");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível resgatar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/5 bg-gradient-to-r from-red-600/20 to-emerald-600/20">
        <Gift className="h-5 w-5 text-red-400" />
        <span className="font-semibold flex-1">Missões de Natal</span>
        <span className="flex items-center gap-1 text-xs font-mono text-emerald-300">
          <Timer className="h-3.5 w-3.5" /> {formatCountdown(remainingMs)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          CHRISTMAS_MISSIONS.map((m) => {
            const completed = done.has(m.key);
            return (
              <div key={m.key} className="rounded-2xl glass border border-white/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{m.grantsMod ? "🎄" : m.cost ? "📦" : "⭐"}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {m.grantsMod && <span className="flex items-center gap-1 text-fuchsia-400"><Package className="h-3.5 w-3.5" /> Mod exclusivo</span>}
                      {m.coins > 0 && <span className="flex items-center gap-1 text-amber-400"><Coins className="h-3.5 w-3.5" /> +{m.coins}</span>}
                      {m.cost ? <span className="text-muted-foreground">custa {m.cost} 🪙</span> : null}
                    </div>
                  </div>
                  {completed ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-4 w-4" /> Feito</span>
                  ) : (
                    <Button size="sm" disabled={busy === m.key} onClick={() => claim(m.key, m.coins, !!m.grantsMod, m.cost)}>
                      {busy === m.key ? <Loader2 className="h-4 w-4 animate-spin" /> : m.cost ? "Comprar" : "Resgatar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Banner de contagem regressiva exibido no topo para todos os usuários. */
export function EventCountdownBanner() {
  const { event, remainingMs } = useGlobalEvent();
  if (!event) return null;
  return (
    <div className="shrink-0 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium bg-gradient-to-r from-red-600/80 to-emerald-600/80 text-white">
      <span className="animate-pulse">❄️</span>
      <span>{event.title}</span>
      <span className="font-mono opacity-90">· acaba em {formatCountdown(remainingMs)}</span>
    </div>
  );
}
