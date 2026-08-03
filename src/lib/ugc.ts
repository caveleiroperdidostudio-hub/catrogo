import { supabase } from "@/integrations/supabase/client";

export type VideoFormat = "long" | "short";

export type VideoPost = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[];
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  format: VideoFormat;
  views: number;
  created_at: string;
  author?: { username: string; display_name: string; avatar_url: string | null };
};

export type GameEngine = "newcatroid" | "html";

export type GameProject = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_code: string;
  engine: GameEngine;
  published: boolean;
  plays: number;
  price: number;
  created_at: string;
  updated_at: string;
  author?: { username: string; display_name: string; avatar_url: string | null };
};

// Colunas seguras (sem source_code) legíveis por qualquer usuário autenticado.
const GAME_COLUMNS = "id, user_id, title, description, plays, price, engine, published, created_at, updated_at";


export type Comment = {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  author?: { username: string; display_name: string; avatar_url: string | null };
};

const AUTHOR_SELECT = "id, user_id, title, description, video_url, thumbnail_url, duration, format, views, tags, created_at";

async function attachAuthors<T extends { user_id: string }>(rows: T[]): Promise<(T & { author?: VideoPost["author"] })[]> {
  if (rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: map.get(r.user_id) as VideoPost["author"] }));
}

/* ---------------- Thumbnails ---------------- */

// Captura um quadro do vídeo no navegador e devolve um JPEG como Blob.
export async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(null);
    };
    const grab = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return fail();
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail();
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.8,
        );
      } catch {
        fail();
      }
    };
    video.onloadedmetadata = () => {
      // pula para ~1s (ou meio do vídeo se curto) para evitar quadro preto inicial
      const target = Math.min(1, (video.duration || 2) / 2);
      const onSeeked = () => grab();
      video.onseeked = onSeeked;
      try {
        video.currentTime = target;
      } catch {
        grab();
      }
    };
    video.onerror = fail;
    setTimeout(fail, 10000);
    video.src = url;
  });
}

/* ---------------- Perfis / Canais ---------------- */

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  about: string | null;
  avatar_url: string | null;
};

export async function getProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, about, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as PublicProfile) ?? null;
}

/* ---------------- Vídeos ---------------- */


export async function listVideos(format?: VideoFormat): Promise<VideoPost[]> {
  let q = supabase.from("posts_video").select(AUTHOR_SELECT).order("created_at", { ascending: false });
  if (format) q = q.eq("format", format);
  const { data, error } = await q;
  if (error) throw error;
  return attachAuthors((data ?? []) as VideoPost[]);
}

export async function listUserVideos(userId: string): Promise<VideoPost[]> {
  const { data, error } = await supabase
    .from("posts_video")
    .select(AUTHOR_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VideoPost[];
}

export async function uploadVideo(params: {
  userId: string;
  file: File;
  title: string;
  description: string;
  tags: string[];
  format: VideoFormat;
  thumbnailUrl?: string | null;
  duration?: number | null;
}): Promise<VideoPost> {
  const ext = params.file.name.split(".").pop() || "mp4";
  const base = `${params.userId}/videos/${Date.now()}`;
  const path = `${base}.${ext}`;
  const { error: upErr } = await supabase.storage.from("status-media").upload(path, params.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: params.file.type || "video/mp4",
  });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("status-media").getPublicUrl(path);

  // Gera a thumbnail automaticamente a partir do vídeo (se não foi informada)
  let thumbnailUrl = params.thumbnailUrl ?? null;
  if (!thumbnailUrl) {
    try {
      const thumb = await captureVideoThumbnail(params.file);
      if (thumb) {
        const thumbPath = `${base}-thumb.jpg`;
        const { error: thErr } = await supabase.storage
          .from("status-media")
          .upload(thumbPath, thumb, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
        if (!thErr) {
          thumbnailUrl = supabase.storage.from("status-media").getPublicUrl(thumbPath).data.publicUrl;
        }
      }
    } catch {
      // segue sem thumbnail se falhar
    }
  }


  const { data, error } = await supabase
    .from("posts_video")
    .insert({
      user_id: params.userId,
      title: params.title,
      description: params.description || null,
      tags: params.tags,
      video_url: pub.publicUrl,
      thumbnail_url: thumbnailUrl,
      duration: params.duration ?? null,
      format: params.format,
    })
    .select(AUTHOR_SELECT)
    .single();
  if (error) throw error;
  return data as VideoPost;
}

export async function deleteVideo(id: string) {
  const { error } = await supabase.from("posts_video").delete().eq("id", id);
  if (error) throw error;
}

export async function registerView(videoId: string) {
  await supabase.rpc("increment_video_views", { _id: videoId });
}

/* ---------------- Jogos ---------------- */

export async function listGames(): Promise<GameProject[]> {
  const { data, error } = await supabase
    .from("projects_games")
    .select(GAME_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachAuthors(((data ?? []) as unknown as GameProject[]).map((g) => ({ ...g, source_code: "" })));
}

export async function listUserGames(userId: string): Promise<GameProject[]> {
  const { data, error } = await supabase
    .from("projects_games")
    .select(GAME_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as GameProject[]).map((g) => ({ ...g, source_code: "" }));
}

/** Busca o código-fonte de um jogo; o servidor valida propriedade/compra. */
export async function getGameSource(gameId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_game_source", { _game_id: gameId });
  if (error) throw new Error(error.message);
  return (data as string) ?? "";
}


export async function saveGame(params: {
  id?: string;
  userId: string;
  title: string;
  description: string;
  sourceCode: string;
  price?: number;
  engine?: GameEngine;
  published?: boolean;
}): Promise<GameProject> {
  const price = Math.max(0, Math.floor(params.price ?? 0));
  const engine: GameEngine = params.engine ?? "newcatroid";
  if (params.id) {
    const { data, error } = await supabase
      .from("projects_games")
      .update({
        title: params.title,
        description: params.description || null,
        source_code: params.sourceCode,
        price,
        engine,
        ...(params.published === undefined ? {} : { published: params.published }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as GameProject;
  }
  const { data, error } = await supabase
    .from("projects_games")
    .insert({
      user_id: params.userId,
      title: params.title,
      description: params.description || null,
      source_code: params.sourceCode,
      price,
      engine,
      published: params.published ?? false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as GameProject;
}

/** Marca um jogo como publicado na vitrine do CatroGo. */
export async function publishGame(id: string) {
  const { error } = await supabase
    .from("projects_games")
    .update({ published: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}



export async function deleteGame(id: string) {
  const { error } = await supabase.from("projects_games").delete().eq("id", id);
  if (error) throw error;
}

export async function registerPlay(gameId: string) {
  await supabase.rpc("increment_game_plays", { _id: gameId });
}

/* ---------------- Interações ---------------- */

export type TargetType = "video" | "game";

export async function getLikeState(targetType: TargetType, targetId: string, userId: string) {
  const [{ count }, mine] = await Promise.all([
    supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("kind", "like"),
    supabase
      .from("interactions")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("kind", "like")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  return { count: count ?? 0, liked: !!mine.data };
}

export async function toggleLike(targetType: TargetType, targetId: string, userId: string, liked: boolean) {
  if (liked) {
    await supabase
      .from("interactions")
      .delete()
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("kind", "like")
      .eq("user_id", userId);
  } else {
    await supabase.from("interactions").insert({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      kind: "like",
    });
  }
}

export async function listComments(targetType: TargetType, targetId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("interactions")
    .select("id, user_id, content, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("kind", "comment")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachAuthors((data ?? []) as Comment[]);
}

export async function addComment(targetType: TargetType, targetId: string, userId: string, content: string) {
  const { error } = await supabase.from("interactions").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
    kind: "comment",
    content,
  });
  if (error) throw error;
}

/* ---------------- Seguidores ---------------- */

export async function getFollowStats(userId: string, viewerId?: string) {
  const [{ count: followers }, { count: following }, mine] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    viewerId && viewerId !== userId
      ? supabase.from("follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { followers: followers ?? 0, following: following ?? 0, isFollowing: !!(mine as { data: unknown }).data };
}

export async function toggleFollow(targetUserId: string, viewerId: string, isFollowing: boolean) {
  if (isFollowing) {
    await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", targetUserId);
  } else {
    await supabase.from("follows").insert({ follower_id: viewerId, following_id: targetUserId });
  }
}
