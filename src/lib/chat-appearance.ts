export type ChatAppearance = {
  palette: "original" | "ocean" | "forest" | "berry" | "graphite";
  scheme: "dark" | "light";
  bubble: "round" | "classic" | "sharp" | "minimal";
  radius: number;
  density: "compact" | "comfortable" | "spacious";
  list: "comfortable" | "compact";
  background: "default" | "plain" | "grid";
  glass: "off" | "soft" | "crystal" | "smoked";
};

export const DEFAULT_CHAT_APPEARANCE: ChatAppearance = {
  palette: "original", scheme: "dark", bubble: "round", radius: 18,
  density: "comfortable", list: "comfortable", background: "default", glass: "off",
};

export function normalizeChatAppearance(value: Partial<ChatAppearance>, premium = true): ChatAppearance {
  const merged = { ...DEFAULT_CHAT_APPEARANCE, ...value };
  return {
    palette: ["original", "ocean", "forest", "berry", "graphite"].includes(merged.palette) ? merged.palette : "original",
    scheme: merged.scheme === "light" ? "light" : "dark",
    bubble: ["round", "classic", "sharp", "minimal"].includes(merged.bubble) ? merged.bubble : "round",
    radius: Number.isFinite(merged.radius) ? Math.max(4, Math.min(24, merged.radius)) : 18,
    density: ["compact", "comfortable", "spacious"].includes(merged.density) ? merged.density : "comfortable",
    list: merged.list === "compact" ? "compact" : "comfortable",
    background: ["default", "plain", "grid"].includes(merged.background) ? merged.background : "default",
    glass: premium && ["soft", "crystal", "smoked"].includes(merged.glass) ? merged.glass : "off",
  };
}

export function chatAppearanceAttributes(value: ChatAppearance) {
  return {
    "data-chat-palette": value.palette, "data-chat-scheme": value.scheme,
    "data-chat-bubble": value.bubble, "data-chat-density": value.density,
    "data-chat-list": value.list, "data-chat-background": value.background,
    "data-chat-glass": value.glass,
  };
}

export function conversationPreview(message: { content: string; cipher?: string | null; deleted_at?: string | null; message_type?: string | null; sender_id?: string | null }, userId: string): string {
  const label = message.deleted_at ? "Mensagem apagada" : message.cipher ? "Mensagem criptografada" :
    ({ image: "Foto", video: "Vídeo", audio: "Áudio", sticker: "Figurinha", file: "Arquivo" }[message.message_type ?? ""] ??
      (message.content.startsWith("[audio:") ? "Áudio" : message.content));
  return `${message.sender_id === userId ? "Você: " : ""}${label}`;
}

export function conversationTime(timestamp: string, now = new Date()): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}