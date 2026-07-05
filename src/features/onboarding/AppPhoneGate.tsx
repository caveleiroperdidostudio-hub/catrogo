import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function AppPhoneGate({ children }: { children: React.ReactNode }) {
  const { profile, session, refreshProfile } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsGate = !!profile && !profile.app_phone_confirmed;

  useEffect(() => {
    let active = true;
    async function ensure() {
      if (!needsGate) return;
      if (profile?.app_phone) {
        setPhone(profile.app_phone);
        return;
      }
      setGenerating(true);
      const { data, error } = await supabase.rpc("assign_app_phone");
      if (!active) return;
      setGenerating(false);
      if (error) {
        toast.error("Não foi possível gerar seu número. Tente novamente.");
        return;
      }
      setPhone(data as unknown as string);
    }
    ensure();
    return () => {
      active = false;
    };
  }, [needsGate, profile?.app_phone]);

  if (!needsGate) return <>{children}</>;

  const confirm = async () => {
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ app_phone_confirmed: true })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao confirmar. Tente novamente.");
      return;
    }
    await refreshProfile();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-2xl">
          📞
        </div>
        <h1 className="text-lg font-semibold text-foreground">Seu número do app</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Agora todo perfil precisa de um número interno do app. Geramos um número único e
          exclusivo para você. Guarde-o para ser contatado dentro da plataforma.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-background px-4 py-4">
          {generating || !phone ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Gerando número...
            </div>
          ) : (
            <span className="text-2xl font-bold tracking-wide text-foreground">{phone}</span>
          )}
        </div>

        <button
          onClick={confirm}
          disabled={saving || generating || !phone}
          className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Confirmando..." : "Confirmar e continuar"}
        </button>
      </div>
    </div>
  );
}
