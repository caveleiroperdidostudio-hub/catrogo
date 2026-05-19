import { Phone, Video } from "lucide-react";

export function CallsTab() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-4">
        <Phone className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold">Chamadas em breve</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Ligações de voz e vídeo <Video className="inline h-3.5 w-3.5" /> chegarão em breve ao CatroGo.
      </p>
    </div>
  );
}
