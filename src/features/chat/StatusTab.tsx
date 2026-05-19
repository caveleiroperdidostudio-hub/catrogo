import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Status = {
  id: string;
  user_id: string;
  content: string;
  background: string | null;
  expires_at: string;
  created_at: string;
  profile?: { display_name: string };
};

const COLORS = ["#075E54", "#128C7E", "#25D366", "#34B7F1", "#EC407A", "#7E57C2", "#FF7043"];

export function StatusTab() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [bg, setBg] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("statuses").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((s) => s.user_id)));
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map(profs?.map((p) => [p.id, p.display_name]));
    setStatuses((data ?? []).map((s) => ({ ...s, profile: { display_name: map.get(s.user_id) ?? "Usuário" } })));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("statuses").on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async () => {
    if (!text.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("statuses").insert({ user_id: user.id, content: text.trim(), background: bg });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); setOpen(false);
    toast.success("Status publicado!");
  };

  const remove = async (id: string) => {
    await supabase.from("statuses").delete().eq("id", id);
  };

  const mine = statuses.filter((s) => s.user_id === user?.id);
  const others = statuses.filter((s) => s.user_id !== user?.id);

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)} className="w-full"><Plus className="h-4 w-4 mr-2" />Adicionar status</Button>

      {mine.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Meus status</h3>
          <ul className="space-y-2">
            {mine.map((s) => (
              <li key={s.id} className="rounded-xl p-3 text-white flex items-start gap-2 shadow" style={{ backgroundColor: s.background ?? "#075E54" }}>
                <div className="flex-1">
                  <p className="font-medium">{s.content}</p>
                  <p className="text-xs opacity-80 mt-1">há {formatDistanceToNow(new Date(s.created_at), { locale: ptBR })}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => remove(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Atualizações recentes</h3>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum status novo de outros usuários.</p>
        ) : (
          <ul className="space-y-2">
            {others.map((s) => (
              <li key={s.id} className="rounded-xl p-3 text-white shadow" style={{ backgroundColor: s.background ?? "#075E54" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-white/20 text-white">{s.profile?.display_name.charAt(0)}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium">{s.profile?.display_name}</span>
                </div>
                <p>{s.content}</p>
                <p className="text-xs opacity-80 mt-1">há {formatDistanceToNow(new Date(s.created_at), { locale: ptBR })}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl p-6 text-white text-center font-medium min-h-[120px] flex items-center justify-center" style={{ backgroundColor: bg }}>
              {text || "Digite algo..."}
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="No que você está pensando?" />
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setBg(c)} className={`h-8 w-8 rounded-full border-2 ${bg === c ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={busy || !text.trim()}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
