import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotifications } from "@/lib/notifications-context";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { formatRelative } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationCenter({ className }: { className?: string }) {
  const { items, unread, loading, markRead, markAllRead, remove, clearAll } = useNotifications();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className={`relative h-9 w-9 tap-press ${className ?? ""}`} title="Notificações" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground cosmic-glow">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col glass">
        <SheetHeader className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="font-display flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Notificações
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={markAllRead} disabled={unread === 0}>
                <CheckCheck className="h-3.5 w-3.5" /> Ler tudo
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive" onClick={clearAll} disabled={items.length === 0}>
                <Trash2 className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <ListSkeleton rows={5} />
          ) : items.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={Bell}
                title="Tudo em ordem"
                description="Você não tem notificações no momento. Elas aparecerão aqui em tempo real."
              />
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary/5 ${n.read ? "" : "bg-primary/[0.06]"}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 border border-primary/25 text-base">
                    {n.icon ?? "🔔"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary cosmic-glow" aria-hidden="true" />}
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                    </div>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {formatRelative(new Date(n.created_at), new Date(), { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                    className="tap-press shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    aria-label="Remover notificação"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
