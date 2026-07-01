import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Loader2, Upload, X, Zap, Share2, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useChannel } from "@/lib/channel-context";
import { useWallet } from "@/lib/wallet-context";
import { sendHype, HYPE_AMOUNTS } from "@/lib/economy";
import {
  listVideos,
  getLikeState,
  toggleLike,
  listComments,
  addComment,
  registerView,
  getFollowStats,
  toggleFollow,
  type VideoPost,
  type Comment,
} from "@/lib/ugc";


function Comments({ video, onClose }: { video: VideoPost; onClose: () => void }) {
  const { user } = useAuth();
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
    <div className="absolute inset-0 z-30 flex flex-col bg-background/95 backdrop-blur">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-white/10">
        <span className="font-medium flex-1">Comentários</span>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem comentários ainda.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-7 w-7"><AvatarFallback>{(c.author?.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            <div><p className="text-xs font-medium">@{c.author?.username ?? "user"}</p><p className="text-sm">{c.content}</p></div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-white/10">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comentar…" className="bg-white/5 border-white/10" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <Button size="icon" onClick={submit}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function ShortCard({ short }: { short: VideoPost }) {
  const { user } = useAuth();
  const { openChannel } = useChannel();
  const { setBalance } = useWallet();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [like, setLike] = useState({ count: 0, liked: false });
  const [showComments, setShowComments] = useState(false);
  const [hypeOpen, setHypeOpen] = useState(false);
  const [follow, setFollow] = useState({ isFollowing: false, busy: false });
  const viewed = useRef(false);
  const isOwn = user?.id === short.user_id;

  useEffect(() => {
    if (user) getLikeState("video", short.id, user.id).then(setLike);
  }, [short.id, user]);

  useEffect(() => {
    if (user && !isOwn) getFollowStats(short.user_id, user.id).then((s) => setFollow((f) => ({ ...f, isFollowing: s.isFollowing })));
  }, [short.user_id, user, isOwn]);

  const handleFollow = async () => {
    if (!user || follow.busy) return;
    const wasFollowing = follow.isFollowing;
    setFollow({ isFollowing: !wasFollowing, busy: true });
    try {
      await toggleFollow(short.user_id, user.id, wasFollowing);
      toast.success(wasFollowing ? "Inscrição cancelada" : "Inscrito! 🔔");
    } catch {
      setFollow({ isFollowing: wasFollowing, busy: false });
      return;
    }
    setFollow({ isFollowing: !wasFollowing, busy: false });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?short=${short.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: short.title, text: `Veja este short no Catrogo: ${short.title}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado! 🔗");
      }
    } catch {
      /* cancelado */
    }
  };


  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
          if (!viewed.current) { viewed.current = true; registerView(short.id); }
        } else {
          el.pause();
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [short.id]);

  const handleLike = async () => {
    if (!user) return;
    const next = !like.liked;
    setLike((l) => ({ count: l.count + (next ? 1 : -1), liked: next }));
    await toggleLike("video", short.id, user.id, like.liked);
  };

  const handleHype = async (amount: number) => {
    setHypeOpen(false);
    try {
      const bal = await sendHype(short.id, amount);
      setBalance(bal);
      toast.success(`Hype de ${amount} CatCoins enviado! ⚡`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível dar hype");
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
  };


  return (
    <div className="relative h-full w-full shrink-0 snap-start snap-always bg-black">
      <video ref={videoRef} src={short.video_url} loop playsInline onClick={togglePlay} className="h-full w-full object-contain" />
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="max-w-[75%] space-y-2 text-white">
          <button onClick={() => openChannel(short.user_id)} className="font-semibold hover:underline">@{short.author?.username ?? "criador"}</button>
          <p className="text-sm opacity-90">{short.title}</p>
        </div>
        <div className="flex flex-col items-center gap-5 text-white">
          <div className="relative flex flex-col items-center">
            <button onClick={() => openChannel(short.user_id)} className="flex flex-col items-center gap-1">
              <Avatar className="h-9 w-9 border border-white/40"><AvatarFallback>{(short.author?.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            </button>
            {!isOwn && (
              <button
                onClick={handleFollow}
                disabled={follow.busy}
                className={`-mt-1.5 rounded-full p-1 shadow-lg ${follow.isFollowing ? "bg-white/20" : "bg-primary"}`}
              >
                {follow.isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              </button>
            )}
          </div>
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <Heart className={`h-7 w-7 ${like.liked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs">{like.count}</span>
          </button>
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
            <MessageCircle className="h-7 w-7" /><span className="text-xs">Comentar</span>
          </button>
          <div className="relative flex flex-col items-center gap-1">
            <button onClick={() => setHypeOpen((v) => !v)} className="flex flex-col items-center gap-1">
              <Zap className="h-7 w-7 text-amber-400" /><span className="text-xs">Hype</span>
            </button>
            {hypeOpen && (
              <div className="absolute bottom-0 right-9 flex gap-1.5 bg-black/80 rounded-full p-1.5">
                {HYPE_AMOUNTS.map((a) => (
                  <button key={a} onClick={() => handleHype(a)} className="rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-1 hover:bg-amber-500/40">{a}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <Share2 className="h-7 w-7" /><span className="text-xs">Enviar</span>
          </button>
        </div>
      </div>
      {showComments && <Comments video={short} onClose={() => setShowComments(false)} />}

    </div>
  );
}

export function ShortsModule() {
  const [shorts, setShorts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVideos("short")
      .then(setShorts)
      .catch(() => toast.error("Erro ao carregar shorts"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;
  }

  if (shorts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-black text-center px-6">
        <Upload className="h-10 w-10 text-white/60" />
        <p className="text-white/80">Nenhum short ainda.</p>
        <p className="text-sm text-white/50">Vá na aba Vídeos e poste um vídeo no formato "Short (vertical)".</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-black">
      {shorts.map((s) => (
        <div key={s.id} className="h-full w-full"><ShortCard short={s} /></div>
      ))}
    </div>
  );
}
