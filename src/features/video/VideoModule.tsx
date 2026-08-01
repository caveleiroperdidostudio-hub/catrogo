import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Play, Eye, Upload, Loader2, Heart, MessageCircle, Send, X, Trash2, Zap } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { sendHype, HYPE_AMOUNTS } from "@/lib/economy";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { VideoGridSkeleton } from "@/components/ui/list-skeleton";
import { notifyHype } from "@/lib/notify-inapp";
import { useChannel } from "@/lib/channel-context";
import { AdminCommandConsole } from "@/features/admin/AdminCommandConsole";
import {
  listVideos,
  uploadVideo,
  registerView,
  deleteVideo,
  getLikeState,
  toggleLike,
  listComments,
  addComment,
  type VideoPost,
  type Comment,
} from "@/lib/ugc";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `há ${d} dia${d > 1 ? "s" : ""}`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `há ${h}h`;
  const m = Math.floor(diff / 60000);
  return `há ${m}min`;
}

function UploadDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [format, setFormat] = useState<"long" | "short">("long");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!file) return toast.error("Selecione um arquivo de vídeo");
    if (!title.trim()) return toast.error("Adicione um título");
    setBusy(true);
    try {
      await uploadVideo({
        userId: user.id,
        file,
        title: title.trim(),
        description: desc.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        format,
      });
      toast.success("Vídeo publicado!");
      onOpenChange(false);
      setFile(null);
      setTitle("");
      setDesc("");
      setTags("");
      onDone();
    } catch (e) {
      toast.error("Falha no upload: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10">
        <DialogHeader><DialogTitle>Publicar vídeo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="bg-white/5 border-white/10" />
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
          <Textarea placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-white/5 border-white/10" />
          <Input placeholder="Tags separadas por vírgula" value={tags} onChange={(e) => setTags(e.target.value)} className="bg-white/5 border-white/10" />
          <div className="flex gap-2">
            {(["long", "short"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${format === f ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"}`}
              >
                {f === "long" ? "Vídeo longo" : "Short (vertical)"}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Publicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommentsSheet({ video, onClose }: { video: VideoPost; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  const load = async () => setComments(await listComments("video", video.id));
  useEffect(() => { load(); }, [video.id]);

  const submit = async () => {
    if (!user || !text.trim()) return;
    await addComment("video", video.id, user.id, text.trim());
    setText("");
    load();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background/95 backdrop-blur">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-white/10">
        <span className="font-medium flex-1">Comentários</span>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Seja o primeiro a comentar.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-7 w-7"><AvatarFallback>{(c.author?.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            <div>
              <p className="text-xs font-medium">@{c.author?.username ?? "user"}</p>
              <p className="text-sm">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-white/10">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Adicione um comentário…" className="bg-white/5 border-white/10" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <Button size="icon" onClick={submit}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function VideoPlayer({ video, onDeleted }: { video: VideoPost; onDeleted: () => void }) {
  const { user } = useAuth();
  const { openChannel } = useChannel();
  const { setBalance } = useWallet();
  const [like, setLike] = useState({ count: 0, liked: false });
  const [showComments, setShowComments] = useState(false);
  const [hypeOpen, setHypeOpen] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (user) getLikeState("video", video.id, user.id).then(setLike);
  }, [video.id, user]);

  const handleHype = async (amount: number) => {
    setHypeOpen(false);
    try {
      const bal = await sendHype(video.id, amount);
      setBalance(bal);
      notifyHype(video.user_id, amount).catch(() => {});
      toast.success(`Hype de ${amount} CatCoins enviado! ⚡`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível dar hype");
    }
  };

  const onPlay = () => {
    if (!viewed.current) {
      viewed.current = true;
      registerView(video.id);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    const next = !like.liked;
    setLike((l) => ({ count: l.count + (next ? 1 : -1), liked: next }));
    await toggleLike("video", video.id, user.id, like.liked);
  };

  return (
    <div className="rounded-2xl overflow-hidden glass border border-white/10 relative">
      <video src={video.video_url} controls onPlay={onPlay} className="w-full aspect-video bg-black" poster={video.thumbnail_url ?? undefined} />
      <div className="p-4">
        <h2 className="font-semibold leading-snug">{video.title}</h2>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" /> {video.views} visualizações · {timeAgo(video.created_at)}
        </p>
        <button onClick={() => openChannel(video.user_id)} className="flex items-center gap-2 mt-3 w-full text-left">
          <Avatar className="h-8 w-8"><AvatarFallback>{(video.author?.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
          <span className="text-sm font-medium flex-1 hover:underline">@{video.author?.username ?? "criador"}</span>
        </button>
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="ghost" onClick={handleLike}>
            <Heart className={`h-4 w-4 mr-1 ${like.liked ? "fill-red-500 text-red-500" : ""}`} />{like.count}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowComments(true)}>
            <MessageCircle className="h-4 w-4" />
          </Button>
          {video.user_id !== user?.id && (
            <div className="relative">
              <Button size="sm" variant="ghost" onClick={() => setHypeOpen((v) => !v)}>
                <Zap className="h-4 w-4 mr-1 text-amber-400" /> Hype
              </Button>
              {hypeOpen && (
                <div className="absolute bottom-full mb-1 left-0 flex gap-1.5 bg-black/80 rounded-full p-1.5 z-10">
                  {HYPE_AMOUNTS.map((a) => (
                    <button key={a} onClick={() => handleHype(a)} className="rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-1 hover:bg-amber-500/40">{a}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {video.user_id === user?.id && (
            <Button size="icon" variant="ghost" onClick={async () => { await deleteVideo(video.id); toast.success("Vídeo removido"); onDeleted(); }}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>
        {video.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{video.description}</p>}
      </div>
      {showComments && <CommentsSheet video={video} onClose={() => setShowComments(false)} />}
    </div>
  );
}

export function VideoModule() {
  const { isOwner } = useAuth();
  const [query, setQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<VideoPost | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleQueryChange = (value: string) => {
    if (isOwner && value.trim().toLowerCase() === "/abrir painel adm") {
      setQuery("");
      setAdminOpen(true);
      return;
    }
    setQuery(value);
  };

  const load = async () => {
    setLoading(true);
    try {
      setVideos(await listVideos("long"));
    } catch {
      toast.error("Erro ao carregar vídeos");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => videos.filter((v) => v.title.toLowerCase().includes(query.toLowerCase())),
    [query, videos]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2 space-y-3 border-b border-white/5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => handleQueryChange(e.target.value)} placeholder="Buscar vídeos…" className="pl-9 bg-white/5 border-white/10" />
            {adminOpen && <AdminCommandConsole onClose={() => setAdminOpen(false)} />}
          </div>
          <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-1" />Postar</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {playing && <VideoPlayer video={playing} onDeleted={() => { setPlaying(null); load(); }} />}

        {loading ? (
          <VideoGridSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Play className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum vídeo ainda. Seja o primeiro a postar!</p>
            <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-1" />Postar vídeo</Button>
          </div>
        ) : (
          filtered.map((v) => (
            <button key={v.id} onClick={() => setPlaying(v)} className="w-full text-left group">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Play className="h-12 w-12 text-white/70 group-hover:scale-110 transition" fill="currentColor" />
                )}
              </div>
              <div className="flex gap-3 mt-2.5">
                <Avatar className="h-9 w-9 shrink-0"><AvatarFallback>{(v.author?.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium leading-snug line-clamp-2">{v.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">@{v.author?.username ?? "criador"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Eye className="h-3 w-3" />{v.views} · {timeAgo(v.created_at)}</p>
                </div>
              </div>
            </button>
          ))
        )}
        <div className="h-2" />
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onDone={load} />
    </div>
  );
}
