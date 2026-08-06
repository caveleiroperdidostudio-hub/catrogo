import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { aiLesson, aiWorkout } from "@/lib/creative-ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Loader2, Flame, Dumbbell, Trophy, Check, X } from "lucide-react";
import { toast } from "sonner";

type Progresso = { track: string; xp: number; level: number; streak: number };
type Question = { prompt: string; options: string[]; answer: number; explain: string };

const TRACKS = ["Inglês", "Espanhol", "Francês", "Japonês", "Alemão", "Italiano"];

export function PersonalModule() {
  const { user } = useAuth();
  const lessonFn = useServerFn(aiLesson);
  const workoutFn = useServerFn(aiWorkout);

  const [progress, setProgress] = useState<Progresso[]>([]);
  const [track, setTrack] = useState(TRACKS[0]);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lesson, setLesson] = useState<{ topic: string; tip: string; questions: Question[] } | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  const [goal, setGoal] = useState("Perder gordura e ganhar resistência");
  const [minutes, setMinutes] = useState("20");
  const [level, setLevel] = useState("iniciante");
  const [equipment, setEquipment] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const current = progress.find((p) => p.track === track) ?? { track, xp: 0, level: 1, streak: 0 };

  const loadProgress = async () => {
    if (!user) return;
    const { data } = await supabase.from("learning_progress").select("track, xp, level, streak").eq("user_id", user.id);
    setProgress((data ?? []) as Progresso[]);
  };

  useEffect(() => {
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startLesson = async () => {
    setLoadingLesson(true);
    setLesson(null);
    setStep(0);
    setPicked(null);
    setCorrect(0);
    try {
      const r = await lessonFn({ data: { track, level: current.level } });
      if (r.questions.length === 0) throw new Error("A IA não conseguiu montar a lição agora.");
      setLesson(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingLesson(false);
    }
  };

  const answer = (i: number) => {
    if (picked !== null || !lesson) return;
    setPicked(i);
    if (i === lesson.questions[step].answer) setCorrect((c) => c + 1);
  };

  const next = async () => {
    if (!lesson) return;
    if (step + 1 < lesson.questions.length) {
      setStep(step + 1);
      setPicked(null);
      return;
    }
    const xp = correct * 10;
    const { data, error } = await supabase.rpc("add_learning_xp", { _track: track, _xp: xp });
    const res = data as { ok?: boolean; xp?: number; level?: number; streak?: number } | null;
    if (error || !res?.ok) toast.error("Não foi possível salvar seu XP");
    else toast.success(`+${xp} XP · nível ${res.level} · ofensiva ${res.streak} 🔥`);
    setLesson(null);
    await loadProgress();
  };

  const makePlan = async () => {
    setLoadingPlan(true);
    setPlan(null);
    try {
      const r = await workoutFn({
        data: { goal, minutes: Math.max(5, Math.min(120, Number(minutes) || 20)), level, equipment: equipment || undefined },
      });
      setPlan(r.plan);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const xpInLevel = current.xp % 100;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-4">
        <div className="cosmic-glow flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/20">
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">IA Personal</div>
          <div className="text-[11px] text-muted-foreground">Idiomas e treinos com a IA do CatroGo</div>
        </div>
      </div>

      <Tabs defaultValue="idiomas" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2">
          <TabsTrigger value="idiomas">Idiomas</TabsTrigger>
          <TabsTrigger value="treino">Treino</TabsTrigger>
        </TabsList>

        <TabsContent value="idiomas" className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TRACKS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTrack(t);
                  setLesson(null);
                }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                  track === t ? "border-primary/50 bg-primary/20 text-primary" : "border-white/10 text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="glass mt-3 space-y-2 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Trophy className="h-4 w-4 text-primary" /> Nível {current.level}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Flame className="h-4 w-4 text-amber-400" /> {current.streak} dias
              </span>
            </div>
            <Progress value={xpInLevel} />
            <p className="text-[11px] text-muted-foreground">{current.xp} XP totais · {100 - xpInLevel} XP para o próximo nível</p>
          </div>

          {!lesson ? (
            <Button onClick={startLesson} disabled={loadingLesson} className="cosmic-glow mt-4 w-full">
              {loadingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Começar lição de {track}
            </Button>
          ) : (
            <div className="glass mt-4 space-y-3 rounded-2xl border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {lesson.topic} · {step + 1}/{lesson.questions.length}
              </div>
              {lesson.tip && step === 0 && <p className="text-xs text-muted-foreground">💡 {lesson.tip}</p>}
              <p className="text-sm font-medium">{lesson.questions[step].prompt}</p>
              <div className="space-y-2">
                {lesson.questions[step].options.map((o, i) => {
                  const isRight = i === lesson.questions[step].answer;
                  const show = picked !== null;
                  return (
                    <button
                      key={i}
                      onClick={() => answer(i)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        show && isRight
                          ? "border-emerald-500/40 bg-emerald-500/15"
                          : show && picked === i
                            ? "border-red-500/40 bg-red-500/15"
                            : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {show && isRight && <Check className="h-4 w-4 text-emerald-400" />}
                      {show && !isRight && picked === i && <X className="h-4 w-4 text-red-400" />}
                      {o}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <>
                  <p className="text-xs text-muted-foreground">{lesson.questions[step].explain}</p>
                  <Button onClick={next} className="w-full">
                    {step + 1 < lesson.questions.length ? "Próxima" : "Finalizar lição"}
                  </Button>
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="treino" className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="glass space-y-3 rounded-2xl border border-white/10 p-4">
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Minutos</Label>
                <Input value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="h-9 w-full rounded-md border border-white/10 bg-secondary/40 px-2 text-sm"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediário">Intermediário</option>
                  <option value="avançado">Avançado</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Equipamentos (opcional)</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="halteres, elástico…" />
            </div>
            <Button onClick={makePlan} disabled={loadingPlan} className="cosmic-glow w-full">
              {loadingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Dumbbell className="mr-2 h-4 w-4" />} Montar treino
            </Button>
          </div>
          {plan && (
            <div className="glass mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 p-4 text-sm">{plan}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
