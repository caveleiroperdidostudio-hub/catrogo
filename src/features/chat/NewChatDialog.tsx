import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search } from "lucide-react";

type Profile = { id: string; username: string; display_name: string };

export function NewChatDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);

  const search = async (text: string) => {
    setQ(text);
    if (!text.trim() || !user) { setResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .neq("id", user.id)
      .or(`username.ilike.%${text}%,display_name.ilike.%${text}%`)
      .limit(20);
    setResults(data ?? []);
  };

  const startDM = async (other: Profile) => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("start_dm", { _other: other.id });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Erro");
    onCreated(data as string);
    onOpenChange(false);
    reset();
  };

  const createGroup = async () => {
    if (!user) return;
    if (!groupName.trim() || selected.size === 0) return toast.error("Nome do grupo e ao menos 1 membro");
    setBusy(true);
    const { data, error } = await supabase.rpc("create_group", {
      _name: groupName.trim(),
      _members: Array.from(selected),
    });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Erro");
    onCreated(data as string);
    onOpenChange(false);
    reset();
  };

  const reset = () => { setQ(""); setResults([]); setSelected(new Set()); setGroupName(""); };
  const toggle = (id: string) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
        <Tabs defaultValue="dm">
          <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="dm">Pessoa</TabsTrigger><TabsTrigger value="group">Grupo</TabsTrigger></TabsList>
          <TabsContent value="dm" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Buscar por nome ou @usuario" className="pl-9" />
            </div>
            <ul className="max-h-80 overflow-y-auto space-y-1">
              {results.map((p) => (
                <li key={p.id}>
                  <button onClick={() => startDM(p)} disabled={busy} className="w-full flex items-center gap-3 p-2 hover:bg-accent/10 rounded-lg text-left">
                    <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-primary">{p.display_name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                    <div><div className="font-medium text-sm">{p.display_name}</div><div className="text-xs text-muted-foreground">@{p.username}</div></div>
                  </button>
                </li>
              ))}
              {q && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Ninguém encontrado</p>}
            </ul>
          </TabsContent>
          <TabsContent value="group" className="space-y-3 mt-3">
            <div className="space-y-1.5"><Label>Nome do grupo</Label><Input value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Adicionar membros</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Buscar..." className="pl-9" />
              </div>
            </div>
            <ul className="max-h-60 overflow-y-auto space-y-1">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 hover:bg-accent/10 rounded-lg">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-primary">{p.display_name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                  <div><div className="font-medium text-sm">{p.display_name}</div><div className="text-xs text-muted-foreground">@{p.username}</div></div>
                </li>
              ))}
            </ul>
            {selected.size > 0 && <p className="text-xs text-muted-foreground">{selected.size} selecionado(s)</p>}
            <DialogFooter><Button onClick={createGroup} disabled={busy}>Criar grupo</Button></DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
