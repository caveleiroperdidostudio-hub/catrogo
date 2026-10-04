import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/features/shell/AppShell";
import { AppPhoneGate } from "@/features/onboarding/AppPhoneGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CATROGO — Chat, IA e comunidade" },
      { name: "description", content: "Converse, crie e explore a comunidade CATROGO com chamadas, IA, mods e Ctrg OS." },
      { property: "og:title", content: "CATROGO — Chat, IA e comunidade" },
      { property: "og:description", content: "Converse, crie e explore a comunidade CATROGO com chamadas, IA, mods e Ctrg OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;
  return (
    <AppPhoneGate>
      <AppShell />
    </AppPhoneGate>
  );
}
