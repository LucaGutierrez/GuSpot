import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-500">
      {children}
    </p>
  );
}
