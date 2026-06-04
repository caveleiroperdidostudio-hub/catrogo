import { useEffect, useState } from "react";
import { Loader2, Play, Gamepad2, LogOut, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  listUserVideos,
  listUserGames,
  getFollowStats,
  type VideoPost,
  type GameProject,
} from "@/lib/ugc";

export function ProfileModule() {
  const { user, profile, signOut } = useAuth();
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [games, setGames] = useState<GameProject[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [tab, setTab] = useState<"videos" | "games">("videos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([listUserVideos(user.id), listUserGames(user.id), getFollowStats(user.id)])
      .then(([v, g, s]) => {
        setVideos(v);
        setGames(g);
        setStats({ followers: s.followers, following: s.following });
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 flex items-center px-4 border-b border-white/5">
        <span className="font-semibold flex-1">Meu perfil</span>
        <Button size="icon" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 flex flex-col items-center gap-3 border-b border-white/5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">{(profile?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="font-semibold text-lg">{profile?.display_name}</h2>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
            {profile?.about && <p className="text-sm mt-1">{profile.about}</p>}
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="font-semibold">{videos.length + games.length}</p><p className="text-xs text-muted-foreground">criações</p></div>
            <div><p className="font-semibold">{stats.followers}</p><p className="text-xs text-muted-foreground">seguidores</p></div>
            <div><p className="font-semibold">{stats.following}</p><p className="text-xs text-muted-foreground">seguindo</p></div>
          </div>
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

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : tab === "videos" ? (
          videos.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Você ainda não postou vídeos.</p>
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
          <p className="text-center text-sm text-muted-foreground py-10">Você ainda não criou jogos.</p>
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
    </div>
  );
}
