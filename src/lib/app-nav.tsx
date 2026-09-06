import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

/** Páginas que a IA pode abrir. Rotas administrativas ficam de fora de propósito. */
export const AI_ALLOWED_ROUTES = [
  { id: "chat", path: "/chat", label: "Chat", aliases: ["conversas", "mensagens", "chat"] },
  { id: "movies", path: "/filmes", label: "Filmes", aliases: ["filme", "filmes", "cinema"] },
  { id: "video", path: "/videos", label: "Vídeos", aliases: ["video", "vídeos"] },
  { id: "shorts", path: "/shorts", label: "Shorts", aliases: ["shorts", "curtos"] },
  { id: "games", path: "/games", label: "Games", aliases: ["jogos", "games"] },
  { id: "ia", path: "/ia", label: "Catrogo IA", aliases: ["ia", "assistente"] },
  { id: "personal", path: "/personal", label: "Personal", aliases: ["aulas", "estudos"] },
  { id: "skins", path: "/skins", label: "Skins", aliases: ["skin", "skins", "avatar"] },
  { id: "mods", path: "/mods", label: "Mods", aliases: ["mods", "modpacks"] },
  { id: "store", path: "/loja", label: "Loja", aliases: ["loja", "catcoins"] },
  { id: "premium", path: "/premium", label: "Premium", aliases: ["premium", "assinatura"] },
  { id: "verify", path: "/selos", label: "Selos", aliases: ["verificação", "selo"] },
  { id: "updates", path: "/novidades", label: "Novidades", aliases: ["changelog", "novidades"] },
  { id: "about", path: "/sobre", label: "Sobre o CatroGo", aliases: ["sobre", "versão", "interface"] },
  { id: "museum", path: "/museu", label: "Museu", aliases: ["museu", "versões antigas"] },
  { id: "settings", path: "/configuracoes", label: "Configurações", aliases: ["configurações", "ajustes"] },
  { id: "profile", path: "/perfil", label: "Perfil", aliases: ["perfil", "minha conta"] },
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
