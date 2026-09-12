import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

/** Páginas que a IA pode abrir. Rotas administrativas ficam de fora de propósito. */
export const AI_ALLOWED_ROUTES = [
  { id: "chat", path: "/chat", label: "Chat", aliases: ["conversas", "mensagens", "chat"] },
  { id: "ia", path: "/ia", label: "CatroGo IA", aliases: ["ia", "assistente"] },
  { id: "explore", path: "/explorar", label: "Explorar", aliases: ["explorar", "mods", "selos", "museu", "novidades"] },
  { id: "premium", path: "/premium", label: "Premium", aliases: ["premium", "assinatura"] },
  { id: "profile", path: "/perfil", label: "Perfil", aliases: ["perfil", "minha conta", "configurações", "ajustes"] },
] as const;

export type AppPageId = (typeof AI_ALLOWED_ROUTES)[number]["id"];

export function isAllowedPage(id: string): id is AppPageId {
  return AI_ALLOWED_ROUTES.some((r) => r.id === id);
}

export function pageLabel(id: string) {
  return AI_ALLOWED_ROUTES.find((r) => r.id === id)?.label ?? id;
}

type NavCtx = {
  go: (id: string, section?: string) => boolean;
  register: (fn: (id: string, section?: string) => boolean) => void;
};

const AppNavContext = createContext<NavCtx | undefined>(undefined);

export function AppNavProvider({ children }: { children: ReactNode }) {
  const handler = useRef<((id: string, section?: string) => boolean) | null>(null);
  const value = useMemo<NavCtx>(
    () => ({
      register: (fn) => {
        handler.current = fn;
      },
      go: (id, section) => {
        if (!isAllowedPage(id)) return false;
        return handler.current ? handler.current(id, section) : false;
      },
    }),
    [],
  );
  return <AppNavContext.Provider value={value}>{children}</AppNavContext.Provider>;
}

export function useAppNav() {
  const ctx = useContext(AppNavContext);
  if (!ctx) throw new Error("useAppNav precisa estar dentro de AppNavProvider");
  return ctx;
}
