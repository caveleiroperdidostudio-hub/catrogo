import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="page-transition max-w-md text-center">
        <div className="relative inline-block">
          <h1 className="font-display text-8xl font-bold bg-gradient-to-br from-[var(--cosmic)] to-[var(--nebula)] bg-clip-text text-transparent">
            404
          </h1>
          <div className="absolute inset-0 -z-10 blur-3xl opacity-40 bg-gradient-to-br from-[var(--cosmic)] to-[var(--nebula)]" />
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold text-foreground">
          Coordenadas perdidas no cosmos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida para outra galáxia.
        </p>
        <div className="mt-7">
          <Link
            to="/"
            className="tap-press inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground cosmic-glow transition hover:brightness-110"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="page-transition max-w-md text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-destructive/15 border border-destructive/30">
          <span className="text-3xl" aria-hidden="true">🛰️</span>
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">
          Distorção temporal detectada
        </h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="tap-press rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground cosmic-glow transition hover:brightness-110"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="tap-press rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70"
          >
            Ir ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0B0B1E" },
      { title: "Cosmos Chat — IA Carlos & Privacidade Galáctica" },
      { name: "description", content: "Cosmos Chat: mensagens instantâneas com a IA Carlos integrada, privacidade extrema e tema minimalista galáctico." },
      { property: "og:title", content: "Cosmos Chat — IA Carlos & Privacidade Galáctica" },
      { name: "twitter:title", content: "Cosmos Chat — IA Carlos & Privacidade Galáctica" },
      { property: "og:description", content: "Mensagens com a IA Carlos integrada, modo fantasma e tema galáctico." },
      { name: "twitter:description", content: "Mensagens com a IA Carlos integrada, modo fantasma e tema galáctico." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <Outlet />
          <Toaster richColors position="top-center" theme="dark" />
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
