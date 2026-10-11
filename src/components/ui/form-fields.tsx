import type { ReactNode } from "react";

// Piezas de formulario usadas en el asistente de publicación y en la gestión
// de espacios. Mantienen labels, ayudas y errores asociados para lectores de
// pantalla (aria-describedby / aria-invalid).

export const inputClass =
  "block w-full rounded-xl border border-ink-300 bg-white px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-2 focus:outline-offset-0 focus:outline-brand-200 disabled:bg-ink-100 disabled:text-ink-500 aria-[invalid=true]:border-red-500 sm:text-sm";

function fieldIds(id: string) {
  return { hint: `${id}-ayuda`, error: `${id}-error` };
}

/** aria-describedby para un campo, según tenga ayuda y/o error. */
export function describedBy(id: string, hint?: ReactNode, error?: string) {
  const ids = fieldIds(id);
  const list = [hint ? ids.hint : null, error ? ids.error : null].filter(Boolean);
  return list.length ? list.join(" ") : undefined;
}

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const ids = fieldIds(id);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
        {label}
        {optional && <span className="font-normal text-ink-500"> (opcional)</span>}
      </label>
      {children}
      {hint && (
        <p id={ids.hint} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
      <FieldError id={ids.error} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
