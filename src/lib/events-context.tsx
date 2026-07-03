import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GlobalEvent = {
  id: string;
  kind: string;
  title: string;
  active: boolean;
  started_at: string;
  ends_at: string;
  created_by: string | null;
  created_at: string;
};

type EventsCtx = {
  event: GlobalEvent | null;
  remainingMs: number;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EventsCtx>({ event: null, remainingMs: 0, refresh: async () => {} });

export function useGlobalEvent() {
  return useContext(Ctx);
}

async function fetchActiveEvent(): Promise<GlobalEvent | null> {
  const { data } = await supabase
    .from("global_events")
    .select("*")
    .eq("active", true)
    .gt("ends_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as GlobalEvent) ?? null;
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<GlobalEvent | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const refresh = useCallback(async () => {
    setEvent(await fetchActiveEvent());
  }, []);

  // initial fetch + realtime subscription
  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("global-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "global_events" }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  // countdown tick + auto-expire
  useEffect(() => {
    if (!event) {
      setRemainingMs(0);
      return;
    }
    const tick = () => {
      const ms = new Date(event.ends_at).getTime() - Date.now();
      if (ms <= 0) {
        setRemainingMs(0);
        setEvent(null);
      } else {
        setRemainingMs(ms);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [event]);

  // apply theme attribute globally
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (event?.kind) html.setAttribute("data-event", event.kind);
    else html.removeAttribute("data-event");
  }, [event]);

  return <Ctx.Provider value={{ event, remainingMs, refresh }}>{children}</Ctx.Provider>;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (h || days) parts.push(`${h}h`);
  if (m || h || days) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

/* ---------- admin/event RPCs ---------- */

export async function startEvent(kind: string, title: string, durationSeconds: number): Promise<string> {
  const { data, error } = await supabase.rpc("start_event", {
    _kind: kind,
    _title: title,
    _duration_seconds: durationSeconds,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function stopEvent(id: string): Promise<void> {
  const { error } = await supabase.rpc("stop_event", { _id: id });
  if (error) throw new Error(error.message);
}

export async function claimEventReward(
  eventId: string,
  missionKey: string,
  coins: number,
  grantExclusiveMod: boolean,
): Promise<number> {
  const { data, error } = await supabase.rpc("claim_event_reward", {
    _event_id: eventId,
    _mission_key: missionKey,
    _coins: coins,
    _grant_exclusive_mod: grantExclusiveMod,
  });
  if (error) throw new Error(error.message);
  return (data as { balance: number }).balance;
}

export async function listCompletedMissions(eventId: string): Promise<Set<string>> {
  const { data } = await supabase.from("event_progress").select("mission_key").eq("event_id", eventId);
  return new Set((data ?? []).map((r) => r.mission_key as string));
}

export async function adminGiveHype(username: string, amount: number): Promise<{ username: string; balance: number }> {
  const { data, error } = await supabase.rpc("admin_give_hype", { _username: username, _amount: amount });
  if (error) throw new Error(error.message);
  const r = data as { username: string; balance: number };
  return r;
}
