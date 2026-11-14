import { useEffect, useState } from "react";
import { Bell, Copy, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChatAppearanceEditor } from "./ChatAppearancePanel";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { myFingerprint } from "@/lib/e2ee";
import { isPushSupported, requestPushPermission } from "@/lib/push";

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const [appPhone, setAppPhone] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !open) return;
    supabase.from("profiles").select("app_phone").eq("id", user.id).maybeSingle().then(({ data }) => setAppPhone(data?.app_phone ?? null));
    myFingerprint().then(setFingerprint).catch(() => setFingerprint(null));
  }, [user, open]);

  const enableNotifications = async () => {
    if (!isPushSupported()) {
      toast.info("As notificações em segundo plano estão disponíveis no app publicado.");
      return;
    }
    const result = await requestPushPermission();
    if (result === "granted") toast.success("Notificações ativadas");
    else if (result === "denied") toast.error("Permissão negada no navegador");
    else toast.info("Notificações não disponíveis neste aparelho");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle>Ajustes das conversas</SheetTitle>
          <SheetDescription>Aparência, notificações e segurança em um só lugar.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 py-5">
          <section className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={enableNotifications}>
              <Bell className="mr-2 h-4 w-4" /> Ativar notificações
            </Button>
            <Button
              variant="outline"
              disabled={!appPhone}
              onClick={() => {
                if (!appPhone) return;
                navigator.clipboard.writeText(appPhone).then(() => toast.success("Número copiado")).catch(() => toast.error("Não foi possível copiar"));
              }}
            >
              {appPhone ? <Copy className="mr-2 h-4 w-4" /> : <Phone className="mr-2 h-4 w-4" />}
              {appPhone ? "Copiar meu número" : "Número indisponível"}
            </Button>
          </section>

          <ChatAppearanceEditor />

          {fingerprint && (
            <details className="rounded-xl border border-border bg-secondary/30 p-4">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Código de segurança deste aparelho
              </summary>
              <p className="mt-3 break-all font-mono text-xs leading-relaxed text-muted-foreground">{fingerprint}</p>
            </details>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
