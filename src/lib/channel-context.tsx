import { createContext, useContext, useState, type ReactNode } from "react";

type ChannelCtx = { openChannel: (userId: string) => void };

const Ctx = createContext<ChannelCtx>({ openChannel: () => {} });

export function useChannel() {
  return useContext(Ctx);
}

export function ChannelProvider({
  children,
  render,
}: {
  children: ReactNode;
  render: (userId: string, close: () => void) => ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  return (
    <Ctx.Provider value={{ openChannel: setUserId }}>
      {children}
      {userId && render(userId, () => setUserId(null))}
    </Ctx.Provider>
  );
}
