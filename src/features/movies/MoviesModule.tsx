import { useEffect, useRef, useState } from "react";
import { CatroPlayer } from "@/components/player/CatroPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { signedUrl, uploadFile } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Film, Plus, Loader2, Eye, X, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Movie = {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  video_url: string;
  category: string;
  year: number | null;
  duration_min: number | null;
  views: number;
};

const CATEGORIES = ["Ação", "Comédia", "Drama", "Terror", "Animação", "Documentário", "Ficção"];

function Poster({ path, title }: { path: string | null; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    if (/^https?:/.test(path)) setUrl(path);
    else signedUrl("movies", path).then(setUrl);
  }, [path]);
  if (!url)
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-white/5 text-center text-xs text-muted-foreground">
        {title}
      </div>
    );
  return <img src={url} alt={`Pôster de ${title}`} loading="lazy" className="aspect-[2/3] w-full rounded-xl object-cover" />;
}

function Player({ movie, startAt, onClose }: { movie: Movie; startAt: number; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (/^https?:/.test(movie.video_url)) setUrl(movie.video_url);
    else signedUrl("movies", movie.video_url).then(setUrl);
    if (movie.poster_url) {
      if (/^https?:/.test(movie.poster_url)) setPoster(movie.poster_url);
      else signedUrl("movies", movie.poster_url).then(setPoster);
    }
    supabase.rpc("increment_movie_views", { _id: movie.id }).then(() => {});
  }, [movie]);

  const saveProgress = async (sec: number, dur: number) => {
    if (Math.abs(sec - lastSaved.current) < 10) return;
    lastSaved.current = sec;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("movie_progress").upsert(
      { user_id: data.user.id, movie_id: movie.id, position_sec: Math.floor(sec), duration_sec: Math.floor(dur), updated_at: new Date().toISOString() },
      { onConflict: "user_id,movie_id" },
    );
  };

  if (!url)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <Button size="icon" variant="ghost" className="absolute right-3 top-3" onClick={onClose} aria-label="Fechar filme">
          <X className="h-5 w-5" />
        </Button>
      </div>
    );

  return (
    <CatroPlayer
      title={movie.title}
      subtitle={[movie.category, movie.year ?? "", movie.duration_min ? `${movie.duration_min} min` : ""].filter(Boolean).join(" · ")}
      sources={[{ label: "Original", src: url }]}
      poster={poster}
      startAt={startAt}
      onProgress={saveProgress}
      onClose={onClose}
    />
  );
}

/** Categoria Filmes: catálogo global; dono e admins publicam. */
export function MoviesModule() {
  const { user, isOwner } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(false);
  const [cat, setCat] = useState<string>("Todos");
  const [playing, setPlaying] = useState<Movie | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteName, setPromoteName] = useState("");

  const [progress, setProgress] = useState<Record<string, { pos: number; dur: number }>>({});
  const [form, setForm] = useState({ title: "", description: "", category: CATEGORIES[0], year: "", duration: "", rights: "", license: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("movies")
      .select("id, title, description, poster_url, video_url, category, year, duration_min, views")
      .order("created_at", { ascending: false });
    setMovies((data ?? []) as Movie[]);
    setLoading(false);
  };

  const loadProgress = async () => {
    if (!user) return;
    const { data } = await supabase.from("movie_progress").select("movie_id, position_sec, duration_sec").eq("user_id", user.id);
    const map: Record<string, { pos: number; dur: number }> = {};
    for (const r of data ?? []) map[r.movie_id] = { pos: r.position_sec, dur: r.duration_sec };
    setProgress(map);
  };

  useEffect(() => {
    load();
    loadProgress();
    supabase.rpc("is_staff").then(({ data }) => setStaff(!!data));
  }, [user]);

  const publish = async () => {
    if (!user || !videoFile) return toast.error("Escolha o arquivo do filme");
    if (!form.title.trim()) return toast.error("Dê um título ao filme");
    if (!form.rights.trim()) return toast.error("Informe quem detém os direitos do filme");
    setBusy(true);
    try {
      const videoPath = await uploadFile("movies", user.id, videoFile, videoFile.name);
      const posterPath = posterFile ? await uploadFile("movies", user.id, posterFile, posterFile.name) : null;
      const { error } = await supabase.from("movies").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        year: form.year ? Number(form.year) : null,
        duration_min: form.duration ? Number(form.duration) : null,
        video_url: videoPath,
        poster_url: posterPath,
        rights_holder: form.rights.trim(),
        license_note: form.license.trim() || null,
        created_by: user.id,
      });
      if (error) throw new Error(error.message);
      toast.success("Filme publicado no catálogo!");
      setOpen(false);
      setForm({ title: "", description: "", category: CATEGORIES[0], year: "", duration: "", rights: "", license: "" });
      setVideoFile(null);
      setPosterFile(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    const { data, error } = await supabase.rpc("grant_admin", { _username: promoteName.trim() });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(res?.error ?? error?.message ?? "Falha ao promover");
    toast.success(`@${promoteName.trim()} agora é admin`);
    setPromoteName("");
    setPromoteOpen(false);
  };

  const list = cat === "Todos" ? movies : movies.filter((m) => m.category === cat);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-4">
        <div className="cosmic-glow flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/20">
          <Film className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">Filmes</div>
          <div className="text-[11px] text-muted-foreground">Catálogo global do CatroGo</div>
        </div>
        {isOwner && (
          <Button size="icon" variant="ghost" onClick={() => setPromoteOpen(true)} title="Dar admin">
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
        {staff && (
          <Button size="sm" className="cosmic-glow" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Filme
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {["Todos", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
              cat === c ? "border-primary/50 bg-primary/20 text-primary" : "border-white/10 text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {staff ? "Nenhum filme ainda. Publique o primeiro!" : "Ainda não há filmes no catálogo."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((m) => (
              <button key={m.id} onClick={() => setPlaying(m)} className="tap-press text-left">
                <Poster path={m.poster_url} title={m.title} />
                <div className="mt-1 truncate text-sm font-medium">{m.title}</div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Eye className="h-3 w-3" /> {m.views}
                  {m.year ? ` · ${m.year}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {playing && (
        <Player
          movie={playing}
          startAt={progress[playing.id]?.pos ?? 0}
          onClose={() => {
            setPlaying(null);
            loadProgress();
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Publicar filme
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Sinopse</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-9 w-full rounded-md border border-white/10 bg-secondary/40 px-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div className="space-y-1.5">
                <Label>Min.</Label>
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Arquivo do filme</Label>
              <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pôster (opcional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Detentor dos direitos</Label>
              <Input
                value={form.rights}
                onChange={(e) => setForm({ ...form, rights: e.target.value })}
                placeholder="ex: Axis Film Studio / estúdio licenciante"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Licença ou contrato (opcional)</Label>
              <Textarea
                value={form.license}
                onChange={(e) => setForm({ ...form, license: e.target.value })}
                rows={2}
                placeholder="ex: contrato de distribuição nº 123, conteúdo original, domínio público…"
              />
              <p className="text-xs text-muted-foreground">
                Publique apenas conteúdo próprio, licenciado ou em domínio público.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={publish} disabled={busy} className="cosmic-glow">
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome de usuário (@)</Label>
            <Input value={promoteName} onChange={(e) => setPromoteName(e.target.value)} placeholder="ex: joao" />
            <p className="text-xs text-muted-foreground">Admins podem publicar filmes, mas não têm poderes de dono.</p>
          </div>
          <DialogFooter>
            <Button onClick={promote} disabled={!promoteName.trim()}>
              Promover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
