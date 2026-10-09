import type { ReactNode } from "react";

export function SectionTitle({ id, title, count }: { id: string; title: string; count?: number }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-ink-900">
      {title}
      {count !== undefined && (
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">
          {count}
        </span>
      )}
    </h2>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-500">
      {children}
    </p>
  );
}
