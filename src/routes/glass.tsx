import { createFileRoute } from "@tanstack/react-router";
import { GlassLensDock } from "@/features/glass/GlassLensDock";

export const Route = createFileRoute("/glass")({
  component: GlassLensDock,
});
