import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Post = {
  id: string;
  author: string;
  caption: string;
  likes: number;
  comments: number;
  hue: number;
};

const STORIES = ["Você", "nova", "astro", "luna", "catrogo", "orbit"];

const POSTS: Post[] = [
  { id: "1", author: "nova", caption: "Pôr do sol em Marte 🪐 #catrogo", likes: 1240, comments: 88, hue: 30 },
  { id: "2", author: "astro", caption: "Setup novo pra editar os vídeos ⚡", likes: 932, comments: 41, hue: 215 },
  { id: "3", author: "luna", caption: "Lua cheia hoje, façam seus pedidos 🌕", likes: 5300, comments: 210, hue: 280 },
];

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <article className="border-b border-white/5 pb-3">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Avatar className="h-8 w-8"><AvatarFallback>{post.author.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
        <span className="text-sm font-medium">@{post.author}</span>
      </div>
      <div
        className="aspect-square w-full"
        style={{ background: `radial-gradient(circle at 50% 40%, oklch(0.5 0.18 ${post.hue} / 0.7), oklch(0.12 0.04 280))` }}
      />
      <div className="flex items-center gap-4 px-3 pt-3">
        <button onClick={() => setLiked((l) => !l)}>
          <Heart className={`h-6 w-6 ${liked ? "fill-red-500 text-red-500" : ""}`} />
        </button>
        <button><MessageCircle className="h-6 w-6" /></button>
        <button><Send className="h-6 w-6" /></button>
        <button onClick={() => setSaved((s) => !s)} className="ml-auto">
          <Bookmark className={`h-6 w-6 ${saved ? "fill-foreground" : ""}`} />
        </button>
      </div>
      <div className="px-3 pt-2 space-y-0.5">
        <p className="text-sm font-medium">{(post.likes + (liked ? 1 : 0)).toLocaleString("pt-BR")} curtidas</p>
        <p className="text-sm"><span className="font-medium">@{post.author}</span> {post.caption}</p>
        <p className="text-xs text-muted-foreground">Ver todos os {post.comments} comentários</p>
      </div>
    </article>
  );
}

export function SocialModule() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/5">
        <div className="flex gap-4 overflow-x-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {STORIES.map((s, i) => (
            <button key={s} className="flex flex-col items-center gap-1 shrink-0">
              <div className={`relative h-16 w-16 rounded-full p-[2px] ${i === 0 ? "bg-white/10" : "bg-gradient-to-tr from-[var(--cosmic)] to-[var(--nebula)]"}`}>
                <Avatar className="h-full w-full border-2 border-background">
                  <AvatarFallback>{s.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {i === 0 && (
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                    <Plus className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground max-w-16 truncate">{s}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {POSTS.map((p) => <PostCard key={p.id} post={p} />)}
        <div className="h-2" />
      </div>
    </div>
  );
}
