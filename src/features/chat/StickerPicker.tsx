import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { signedUrl, toStickerBlob, uploadFile, dataUrlToBlob } from "@/lib/media";
import { useServerFn } from "@tanstack/react-start";
import { aiStickerIdeas } from "@/lib/creative-ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type StickerRow = { id: string; image_url: string; emoji: string | null; owner_id: string };

export function useStickerUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    signedUrl("stickers", path).then(setUrl);
  }, [path]);
  return url;
}

function StickerImg({ path, className }: { path: string; className?: string }) {
  const url = useStickerUrl(path);
  if (!url) return <div className={`animate-pulse rounded-lg bg-white/10 ${className ?? "h-20 w-20"}`} />;
  return <img src={url} alt="figurinha" loading="lazy" className={className ?? "h-20 w-20 object-contain"} />;
}

/** Painel de figurinhas: minhas, da comunidade e criação (upload ou IA). */
export function StickerPicker({ onPick }: { onPick: (sticker: StickerRow) => void }) {
  const { user } = useAuth();
  const ideas = useServerFn(aiStickerIdeas);
  const [mine, setMine] = useState<StickerRow[]>([]);
  const [community, setCommunity] = useState<StickerRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggested, setSuggested] = useState<{ emoji: string; label: string; dataUrl: string }[]>([]);

  const load = async () => {
    if (!user) return;
    const [own, pub] = await Promise.all([
      supabase.from("stickers").select("id, image_url, emoji, owner_id").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("stickers").select("id, image_url, emoji, owner_id").eq("is_public", true).order("uses", { ascending: false }).limit(40),
    ]);
    setMine((own.data ?? []) as StickerRow[]);
    setCommunity(((pub.data ?? []) as StickerRow[]).filter((s) => s.owner_id !== user.id));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveSticker = async (blob: Blob, emoji: string) => {
    if (!user) return;
    const norm = await toStickerBlob(blob);
    const path = await uploadFile("stickers", user.id, norm, "sticker.png");
    const { error } = await supabase.from("stickers").insert({ owner_id: user.id, image_url: path, emoji, is_public: true });
    if (error) throw new Error(error.message);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      await saveSticker(file, "🖼️");
      await load();
      toast.success("Figurinha criada!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const suggest = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setSuggested([]);
    try {
      const r = await ideas({ data: { query: q.trim() } });
      if (r.stickers.length === 0) toast.info("A IA não conseguiu sugerir agora.");
      setSuggested(r.stickers);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const acceptSuggestion = async (s: { emoji: string; dataUrl: string }) => {
    setBusy(true);
    try {
      await saveSticker(dataUrlToBlob(s.dataUrl), s.emoji);
      setSuggested((prev) => prev.filter((x) => x.dataUrl !== s.dataUrl));
      await load();
      toast.success("Figurinha salva no seu pacote!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("stickers").delete().eq("id", id);
    setMine((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <Tabs defaultValue="mine" className="w-full">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="mine">Minhas</TabsTrigger>
        <TabsTrigger value="community">Comunidade</TabsTrigger>
        <TabsTrigger value="create">Criar</TabsTrigger>
      </TabsList>

      <TabsContent value="mine" className="mt-3">
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Você ainda não tem figurinhas. Crie na aba "Criar".</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {mine.map((s) => (
              <div key={s.id} className="relative group rounded-xl bg-white/5 p-1">
                <button onClick={() => onPick(s)} className="w-full">
                  <StickerImg path={s.image_url} className="h-16 w-full object-contain" />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 rounded-full bg-background/80 p-1"
                  title="Excluir"
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="community" className="mt-3">
        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {community.map((s) => (
            <button key={s.id} onClick={() => onPick(s)} className="rounded-xl bg-white/5 p-1">
              <StickerImg path={s.image_url} className="h-16 w-full object-contain" />
            </button>
          ))}
          {community.length === 0 && <p className="col-span-4 text-sm text-muted-foreground py-6 text-center">Nada por aqui ainda.</p>}
        </div>
      </TabsContent>

      <TabsContent value="create" className="mt-3 space-y-3">
        <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-4 text-sm cursor-pointer hover:bg-white/5">
          <Upload className="h-4 w-4" /> Enviar imagem do aparelho
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>

        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") suggest();
            }}
            placeholder="Descreva a figurinha (ex: gato astronauta rindo)"
          />
          <Button onClick={suggest} disabled={busy || !q.trim()} className="cosmic-glow shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>

        {suggested.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">Sugestões da IA — toque para salvar no seu pacote:</p>
            <div className="grid grid-cols-3 gap-2">
              {suggested.map((s) => (
                <button key={s.dataUrl} onClick={() => acceptSuggestion(s)} className="rounded-xl bg-white/5 p-1 hover:bg-white/10">
                  <img src={s.dataUrl} alt={s.label} className="h-20 w-full object-contain" />
                  <span className="block text-[10px] truncate text-muted-foreground">{s.emoji} {s.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

export { StickerImg };
