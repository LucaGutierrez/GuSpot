import { StarIcon } from "@/components/ui/icons";

/** Calificación de ejemplo (dato de demostración). */
export function Rating({ value }: { value: number }) {
  const text = value.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-700">
      <StarIcon width={14} height={14} className="text-accent-500" />
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">Calificación de ejemplo: {text} de 5</span>
    </span>
  );
}
