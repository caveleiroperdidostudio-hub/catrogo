import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const REASONS = [
  "Conteúdo violento",
  "Assédio ou discurso de ódio",
  "Conteúdo sexual",
  "Spam ou golpe",
  "Direitos autorais",
  "Outro motivo",
];

export function ReportButton({
  targetType,
  targetId,
  label = "Denunciar",
}: {
  targetType: "user" | "video" | "movie" | "mod" | "game" | "message" | "status";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!reason) return toast.error("Escolha um motivo");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      return toast.error("Entre na sua conta para denunciar");
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Denúncia enviada. A equipe vai analisar.");
    setOpen(false);
    setReason("");
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground">
          <Flag className="h-4 w-4 mr-1.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Denunciar</DialogTitle>
          <DialogDescription>Sua denúncia é enviada em sigilo para a equipe do CatroGo.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                reason === r ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/5"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Detalhes (opcional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="bg-white/5 border-white/10"
        />
        <Button onClick={send} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar denúncia"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
