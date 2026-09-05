import { useEffect, useState } from "react";
import { ArrowLeft, Play, Gamepad2, Eye, UserPlus, UserCheck } from "lucide-react";
import { notifyFollow } from "@/lib/notify-inapp";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  getProfile,
  listUserVideos,
  listUserGames,
  getFollowStats,
  toggleFollow,
  type PublicProfile,
  type VideoPost,
  type GameProject,
} from "@/lib/ugc";

export function ChannelView({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [games, setGames] = useState<GameProject[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, isFollowing: false });
  const [tab, setTab] = useState<"videos" | "games">("videos");
  const [loading, setLoading] = useState(true);
  const isMe = user?.id === userId;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getProfile(userId),
      listUserVideos(userId),
      listUserGames(userId),
      getFollowStats(userId, user?.id),
    ])
      .then(([p, v, g, s]) => {
        setProfile(p);
        setVideos(v);
        setGames(g);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [userId, user?.id]);

  const handleFollow = async () => {
    if (!user || isMe) return;
    const wasFollowing = stats.isFollowing;
    setStats((s) => ({ ...s, isFollowing: !wasFollowing, followers: s.followers + (wasFollowing ? -1 : 1) }));
    await toggleFollow(userId, user.id, wasFollowing);
    if (!wasFollowing) notifyFollow(userId).catch(() => {});
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
        <Button size="icon" variant="ghost" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>
        <span className="font-semibold truncate flex-1">{profile ? `@${profile.username}` : "Canal"}</span>
        {!isMe && <ReportButton targetType="user" targetId={userId} label="" />}
      </div>


      {loading ? (
        <div className="flex-1 overflow-y-auto"><ListSkeleton rows={4} /></div>
      ) : !profile ? (
        <p className="text-center text-sm text-muted-foreground py-10">Canal não encontrado.</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col items-center gap-3 border-b border-white/5">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="font-semibold text-lg">{profile.display_name}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.about && <p className="text-sm mt-1">{profile.about}</p>}
            </div>
            <div className="flex gap-6 text-center">
              <div><p className="font-semibold">{videos.length + games.length}</p><p className="text-xs text-muted-foreground">criações</p></div>
              <div><p className="font-semibold">{stats.followers}</p><p className="text-xs text-muted-foreground">inscritos</p></div>
              <div><p className="font-semibold">{stats.following}</p><p className="text-xs text-muted-foreground">seguindo</p></div>
            </div>
            {!isMe && user && (
              <Button onClick={handleFollow} variant={stats.isFollowing ? "secondary" : "default"} className="w-40">
                {stats.isFollowing ? <><UserCheck className="h-4 w-4 mr-1" /> Inscrito</> : <><UserPlus className="h-4 w-4 mr-1" /> Inscrever-se</>}
              </Button>
            )}
          </div>

          <div className="flex border-b border-white/5">
            {(["videos", "games"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
              >
                {t === "videos" ? <Play className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
                {t === "videos" ? "Vídeos" : "Jogos"}
              </button>
            ))}
          </div>

          {tab === "videos" ? (
            videos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Nenhum vídeo ainda.</p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 p-0.5">
                {videos.map((v) => (
                  <div key={v.id} className="relative aspect-square bg-black flex items-center justify-center">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Play className="h-6 w-6 text-white/60" fill="currentColor" />
                    )}
                    <span className="absolute bottom-1 left-1 text-[10px] text-white flex items-center gap-0.5"><Eye className="h-3 w-3" />{v.views}</span>
                  </div>
                ))}
              </div>
            )
          ) : games.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhum jogo ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {games.map((g) => (
                <div key={g.id} className="rounded-xl glass border border-white/10 p-3">
                  <h3 className="text-sm font-semibold truncate">{g.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{g.plays} partidas</p>
                </div>
              ))}
            </div>
          )}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
