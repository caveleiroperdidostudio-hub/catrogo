import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Video, Image as ImageIcon, Loader2, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusViewer } from "./StatusViewer";

type Status = {
  id: string;
  user_id: string;
  content: string;
  background: string | null;
  media_url: string | null;
  media_type: string | null;
  expires_at: string;
  created_at: string;
  profile?: { display_name: string };
};

const COLORS = [
  "oklch(0.32 0.18 295)",
  "oklch(0.4 0.18 230)",
  "oklch(0.38 0.2 340)",
  "oklch(0.42 0.2 155)",
  "oklch(0.5 0.2 70)",
  "oklch(0.25 0.05 280)",
];

export function StatusTab() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [bg, setBg] = useState(COLORS[0]);
  const [media, setMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("statuses").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((s) => s.user_id)));
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map(profs?.map((p) => [p.id, p.display_name]));
    setStatuses((data ?? []).map((s: any) => ({ ...s, profile: { display_name: map.get(s.user_id) ?? "Viajante" } })));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("statuses").on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const uploadMedia = async (file: File) => {
    if (!user) return;
    if (file.size > 30 * 1024 * 1024) return toast.error("Máximo 30MB");
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return toast.error("Envie imagem ou vídeo");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("status-media").upload(path, file, { contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("status-media").getPublicUrl(path);
    setMedia({ url: data.publicUrl, type: isVideo ? "video" : "image" });
    setUploading(false);
  };

  const create = async () => {
    if ((!text.trim() && !media) || !user) return;
    setBusy(true);
    const { error } = await supabase.from("statuses").insert({
      user_id: user.id,
      content: text.trim() || (media ? (media.type === "video" ? "🎬 Vídeo" : "📸 Foto") : ""),
      background: bg,
      media_url: media?.url ?? null,
      media_type: media?.type ?? null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); setMedia(null); setOpen(false);
    toast.success("Status publicado!");
  };

  const remove = async (id: string) => {
    await supabase.from("statuses").delete().eq("id", id);
  };

  const mine = statuses.filter((s) => s.user_id === user?.id);
  const others = statuses.filter((s) => s.user_id !== user?.id);

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)} className="w-full"><Plus className="h-4 w-4 mr-2" />Novo status</Button>

      {mine.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Meus status</h3>
          <ul className="space-y-2">
            {mine.map((s) => <StatusCard key={s.id} s={s} onRemove={() => remove(s.id)} mine />)}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Constelação ativa</h3>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem sinais novos no momento.</p>
        ) : (
          <ul className="space-y-2">
            {others.map((s) => <StatusCard key={s.id} s={s} />)}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setMedia(null); setText(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden text-white text-center font-medium min-h-[160px] flex items-center justify-center relative" style={{ background: bg }}>
              {media?.type === "image" && <img src={media.url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              {media?.type === "video" && <video src={media.url} className="absolute inset-0 h-full w-full object-cover" muted autoPlay loop playsInline />}
              <span className="relative z-10 px-4 py-2 bg-black/30 rounded-md backdrop-blur-sm">
                {text || (media ? "Adicione uma legenda" : "Digite algo...")}
              </span>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Sua mensagem cósmica..." rows={2} />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                Foto
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Video className="h-4 w-4 mr-1.5" /> Vídeo
              </Button>
              {media && <Button type="button" size="sm" variant="ghost" onClick={() => setMedia(null)}>Remover mídia</Button>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = ""; }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setBg(c)} className={`h-8 w-8 rounded-full border-2 ${bg === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={busy || uploading || (!text.trim() && !media)}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusCard({ s, mine, onRemove }: { s: Status; mine?: boolean; onRemove?: () => void }) {
  return (
    <li className="rounded-xl overflow-hidden text-white shadow relative min-h-[80px]" style={{ background: s.background ?? "oklch(0.32 0.18 295)" }}>
      {s.media_type === "image" && s.media_url && (
        <img src={s.media_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      )}
      {s.media_type === "video" && s.media_url && (
        <video src={s.media_url} className="absolute inset-0 h-full w-full object-cover opacity-90" muted loop playsInline autoPlay />
      )}
      <div className="relative z-10 p-3 backdrop-blur-[1px] bg-black/20">
        {!mine && (
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-white/20 text-white">{s.profile?.display_name.charAt(0)}</AvatarFallback></Avatar>
            <span className="text-sm font-medium">{s.profile?.display_name}</span>
          </div>
        )}
        <p className="font-medium">{s.content}</p>
        <p className="text-xs opacity-80 mt-1">há {formatDistanceToNow(new Date(s.created_at), { locale: ptBR })}</p>
        {mine && onRemove && (
          <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-white hover:bg-white/20" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}
