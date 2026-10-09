"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoBadge } from "@/components/ui/badge";
import { Container } from "@/components/ui/card";

const LINKS = [
  { href: "/propietarios/", label: "Panel", match: (p: string) => p === "/propietarios/" || p === "/propietarios" || p.startsWith("/propietarios/espacios") },
  { href: "/propietarios/publicar/", label: "Publicar", match: (p: string) => p.startsWith("/propietarios/publicar") },
];

/** Navegación interna de la sección de propietarios. */
export function OwnerSubnav({ ownerName }: { ownerName: string }) {
  const pathname = usePathname();
  return (
    <div className="border-b border-ink-200 bg-white">
      <Container className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <nav aria-label="Sección propietarios">
          <ul className="flex gap-1">
            {LINKS.map((l) => {
              const active = l.match(pathname);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-500 ${
                      active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="flex items-center gap-2 text-xs text-ink-500">
          Viendo como: <span className="font-medium text-ink-900">{ownerName}</span>
          <DemoBadge />
        </p>
      </Container>
    </div>
  );
}
