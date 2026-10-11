import { CameraIcon } from "@/components/ui/icons";

/** Recuadro que reemplaza la foto cuando el espacio todavía no tiene ninguna. */
export function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 bg-ink-100 text-ink-500 ${className}`}
    >
      <CameraIcon width={28} height={28} />
      <span className="text-xs font-medium">Sin fotos</span>
    </div>
  );
}
