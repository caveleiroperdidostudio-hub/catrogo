import { cn } from "@/lib/utils";

/** Marca do Nuv: usa o ícone oficial do app (public/icons). Decorativo por padrão. */
export function BrandMark({
  size = 32,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <img
      src="/icons/icon-192.png"
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : "true"}
      draggable={false}
      className={cn("shrink-0 select-none rounded-[26%] object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
