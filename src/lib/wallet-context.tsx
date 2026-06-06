import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getBalance } from "@/lib/economy";

type WalletCtx = {
  balance: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setBalance: (n: number) => void;
};

const Ctx = createContext<WalletCtx>({ balance: 0, loading: true, refresh: async () => {}, setBalance: () => {} });

export function useWallet() {
  return useContext(Ctx);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setBalance(await getBalance(user.id));
  };

  useEffect(() => {
    if (!user) {
      setBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    getBalance(user.id).then((b) => {
      setBalance(b);
      setLoading(false);
    });

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance?: number }).balance;
          if (typeof next === "number") setBalance(next);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return <Ctx.Provider value={{ balance, loading, refresh, setBalance }}>{children}</Ctx.Provider>;
}
