import { supabase } from "@/integrations/supabase/client";

export type Mod = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  source_code: string;
  is_exclusive: boolean;
  installs: number;
  created_at: string;
  updated_at: string;
  author?: { username: string; display_name: string; avatar_url: string | null } | null;
};

export type Modpack = {
  id: string;
  user_id: string;
  name: string;
  mod_ids: string[];
  created_at: string;
};

export type UserMod = {
  id: string;
  user_id: string;
  mod_id: string;
  active: boolean;
  acquired_at: string;
};

export const MOD_EXAMPLE = `// Meu primeiro mod Cosmos
// Você tem liberdade total para editar este código.
nome "Neon Boost"
descricao "Deixa a interface mais vibrante"

// Efeitos visuais
efeito brilho intensidade 2
cor destaque "#7dd3fc"

// Comportamento
ao_abrir_chat mostrar "✨ Mod ativo!"
`;

export async function listMods(): Promise<Mod[]> {
  const { data, error } = await supabase.from("mods").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const mods = (data ?? []) as Mod[];
  const ids = [...new Set(mods.map((m) => m.user_id).filter(Boolean))] as string[];
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    for (const m of mods) m.author = m.user_id ? (map.get(m.user_id) as Mod["author"]) ?? null : null;
  }
  return mods;
}

export async function saveMod(input: {
  id?: string;
  userId: string;
  title: string;
  description: string;
  sourceCode: string;
}): Promise<void> {
  if (input.id) {
    const { error } = await supabase
      .from("mods")
      .update({ title: input.title, description: input.description, source_code: input.sourceCode })
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("mods")
      .insert({ user_id: input.userId, title: input.title, description: input.description, source_code: input.sourceCode });
    if (error) throw error;
  }
}

export async function deleteMod(id: string): Promise<void> {
  const { error } = await supabase.from("mods").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- user mod state (installed + active) ---------- */

export async function listUserMods(userId: string): Promise<UserMod[]> {
  const { data } = await supabase.from("user_mods").select("*").eq("user_id", userId);
  return (data ?? []) as UserMod[];
}

export async function installMod(userId: string, modId: string): Promise<void> {
  const { error } = await supabase
    .from("user_mods")
    .upsert({ user_id: userId, mod_id: modId, active: true }, { onConflict: "user_id,mod_id" });
  if (error) throw error;
}

export async function setModActive(userId: string, modId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("user_mods")
    .update({ active })
    .eq("user_id", userId)
    .eq("mod_id", modId);
  if (error) throw error;
}

export async function uninstallMod(userId: string, modId: string): Promise<void> {
  const { error } = await supabase.from("user_mods").delete().eq("user_id", userId).eq("mod_id", modId);
  if (error) throw error;
}

/* ---------- modpacks ---------- */

export async function listModpacks(userId: string): Promise<Modpack[]> {
  const { data } = await supabase
    .from("modpacks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Modpack[];
}

export async function createModpack(userId: string, name: string, modIds: string[]): Promise<void> {
  const { error } = await supabase.from("modpacks").insert({ user_id: userId, name, mod_ids: modIds });
  if (error) throw error;
}

export async function deleteModpack(id: string): Promise<void> {
  const { error } = await supabase.from("modpacks").delete().eq("id", id);
  if (error) throw error;
}

export async function activateModpack(userId: string, pack: Modpack): Promise<void> {
  for (const modId of pack.mod_ids) {
    await installMod(userId, modId);
  }
}
