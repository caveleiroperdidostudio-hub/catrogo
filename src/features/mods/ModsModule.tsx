import { useEffect, useState } from "react";
import { ArrowLeft, Package, Plus, Save, Trash2, Loader2, Power, PowerOff, Code2, Layers, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { CardListSkeleton } from "@/components/ui/list-skeleton";
import {
  listMods,
  saveMod,
  deleteMod,
  listUserMods,
  installMod,
  setModActive,
  uninstallMod,
  listModpacks,
  createModpack,
  deleteModpack,
  activateModpack,
  MOD_EXAMPLE,
  type Mod,
  type UserMod,
  type Modpack,
} from "@/lib/mods";

type View = "list" | "editor" | "packs";
type Tab = "explorar" | "meus" | "packs";

export function ModsModule() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("explorar");
  const [mods, setMods] = useState<Mod[]>([]);
  const [userMods, setUserMods] = useState<UserMod[]>([]);
  const [packs, setPacks] = useState<Modpack[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Mod | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState(MOD_EXAMPLE);
  const [saving, setSaving] = useState(false);

  const [packName, setPackName] = useState("");
  const [packMods, setPackMods] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ms, um, ps] = await Promise.all([listMods(), listUserMods(user.id), listModpacks(user.id)]);
      setMods(ms);
      setUserMods(um);
      setPacks(ps);
    } catch {
      toast.error("Erro ao carregar mods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stateOf = (modId: string) => userMods.find((u) => u.mod_id === modId);

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setDesc("");
    setCode(MOD_EXAMPLE);
    setView("editor");
  };

  const openEdit = (m: Mod) => {
    setEditing(m);
    setTitle(m.title);
    setDesc(m.description ?? "");
    setCode(m.source_code);
    setView("editor");
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) return toast.error("Dê um nome ao mod");
    setSaving(true);
    try {
      await saveMod({ id: editing?.id, userId: user.id, title: title.trim(), description: desc.trim(), sourceCode: code });
      toast.success("Mod salvo!");
      await load();
      setView("list");
      setTab("meus");
    } catch {
      toast.error("Não foi possível salvar (você só edita seus próprios mods)");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: Mod) => {
    try {
      await deleteMod(m.id);
      toast.success("Mod removido");
      load();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const install = async (m: Mod) => {
    if (!user) return;
    try {
      await installMod(user.id, m.id);
      toast.success(`"${m.title}" instalado e ativado`);
      load();
    } catch {
      toast.error("Erro ao instalar");
    }
  };

  const toggleActive = async (m: Mod, active: boolean) => {
    if (!user) return;
    await setModActive(user.id, m.id, active);
    toast.success(active ? "Mod ativado" : "Mod desativado");
    load();
  };

  const remove = async (m: Mod) => {
    if (!user) return;
    await uninstallMod(user.id, m.id);
    toast.success("Mod desinstalado");
    load();
  };

  const savePack = async () => {
    if (!user) return;
    if (!packName.trim()) return toast.error("Dê um nome ao pacote");
    if (packMods.size === 0) return toast.error("Selecione ao menos 1 mod");
    try {
      await createModpack(user.id, packName.trim(), [...packMods]);
      toast.success("Modpack criado!");
      setPackName("");
      setPackMods(new Set());
      load();
    } catch {
      toast.error("Erro ao criar pacote");
    }
  };

  const applyPack = async (p: Modpack) => {
    if (!user) return;
    await activateModpack(user.id, p);
    toast.success(`Pacote "${p.name}" ativado`);
    load();
  };

  /* ---------- EDITOR (sandbox de código livre) ---------- */
  if (view === "editor") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 flex items-center gap-2 px-3 border-b border-white/5">
          <Button size="icon" variant="ghost" onClick={() => setView("list")}><ArrowLeft className="h-4 w-4" /></Button>
          <span className="font-medium flex-1">{editing ? "Editar mod" : "Novo mod"}</span>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Input placeholder="Nome do mod" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
          <Input placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-white/5 border-white/10" />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Code2 className="h-3.5 w-3.5" /> Código-fonte (edição livre)</p>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="font-mono text-xs min-h-[300px] bg-black/40 border-white/10 leading-relaxed"
            />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- LIST ---------- */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/5">
        <Package className="h-5 w-5 text-[var(--nebula)]" />
        <span className="font-semibold flex-1">Criar Mods</span>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </div>

      <div className="flex border-b border-white/5 text-sm">
        {([["explorar", "Explorar"], ["meus", "Meus mods"], ["packs", "Modpacks"]] as [Tab, string][]).map(([id, lbl]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 font-medium transition ${tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <CardListSkeleton rows={5} />
        ) : tab === "explorar" ? (
          mods.length === 0 ? (
            <Empty onNew={openNew} />
          ) : (
            mods.map((m) => {
              const st = stateOf(m.id);
              return (
                <div key={m.id} className="rounded-2xl glass border border-white/10 p-4">
                  <div className="flex items-start gap-2">
                    <div className="text-2xl">{m.is_exclusive ? "🎄" : "🧩"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold flex items-center gap-1.5 truncate">
                        {m.title}
                        {m.is_exclusive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Exclusivo</span>}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">por @{m.author?.username ?? "sistema"}</p>
                    </div>
                    {st ? (
                      <span className="text-xs text-emerald-400">Instalado</span>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => install(m)}><Sparkles className="h-3.5 w-3.5 mr-1" /> Instalar</Button>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : tab === "meus" ? (
          userMods.length === 0 && mods.filter((m) => m.user_id === user?.id).length === 0 ? (
            <Empty onNew={openNew} />
          ) : (
            <>
              {mods.filter((m) => m.user_id === user?.id).map((m) => (
                <div key={m.id} className="rounded-2xl glass border border-white/10 p-4 flex items-center gap-2">
                  <div className="text-xl">🧩</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">Criado por você</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Code2 className="h-4 w-4" /></Button>
                  <button onClick={() => handleDelete(m)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {userMods.map((um) => {
                const m = mods.find((x) => x.id === um.mod_id);
                if (!m || m.user_id === user?.id) return null;
                return (
                  <div key={um.id} className="rounded-2xl glass border border-white/10 p-4 flex items-center gap-2">
                    <div className="text-xl">{m.is_exclusive ? "🎄" : "🧩"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground">{um.active ? "Ativado" : "Desativado"}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(m, !um.active)}>
                      {um.active ? <Power className="h-4 w-4 text-emerald-400" /> : <PowerOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <button onClick={() => remove(m)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </>
          )
        ) : (
          /* PACKS */
          <>
            <div className="rounded-2xl glass border border-white/10 p-4 space-y-3">
              <p className="font-semibold flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" /> Criar modpack</p>
              <Input placeholder="Nome do pacote" value={packName} onChange={(e) => setPackName(e.target.value)} className="bg-black/30 border-white/10" />
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {userMods.length === 0 && <p className="text-xs text-muted-foreground">Instale mods para combiná-los.</p>}
                {userMods.map((um) => {
                  const m = mods.find((x) => x.id === um.mod_id);
                  if (!m) return null;
                  const on = packMods.has(m.id);
                  return (
                    <button
                      key={um.id}
                      onClick={() => setPackMods((s) => { const n = new Set(s); on ? n.delete(m.id) : n.add(m.id); return n; })}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${on ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}
                    >
                      <span>{m.is_exclusive ? "🎄" : "🧩"}</span>
                      <span className="flex-1 text-left truncate">{m.title}</span>
                      {on && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
              <Button className="w-full" onClick={savePack}><Plus className="h-4 w-4 mr-1" /> Salvar pacote</Button>
            </div>

            {packs.map((p) => (
              <div key={p.id} className="rounded-2xl glass border border-white/10 p-4 flex items-center gap-2">
                <div className="text-xl">📦</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.mod_ids.length} mods</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => applyPack(p)}>Ativar</Button>
                <button onClick={() => deleteModpack(p.id).then(load)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-12 space-y-3">
      <Package className="h-10 w-10 mx-auto text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhum mod ainda. Crie o seu com código aberto!</p>
      <Button onClick={onNew}><Plus className="h-4 w-4 mr-1" /> Criar mod</Button>
    </div>
  );
}
