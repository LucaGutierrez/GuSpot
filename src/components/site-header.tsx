"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ParkingIcon, SearchIcon, TicketIcon } from "./ui/icons";

const NAV = [
  { href: "/", label: "Inicio", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/buscar/", label: "Buscar", icon: SearchIcon, match: (p: string) => p.startsWith("/buscar") || p.startsWith("/espacios") },
  { href: "/mis-reservas/", label: "Mis reservas", icon: TicketIcon, match: (p: string) => p.startsWith("/mis-reservas") },
  { href: "/propietarios/", label: "Propietarios", icon: ParkingIcon, match: (p: string) => p.startsWith("/propietarios") },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-ink-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-lg text-white">P</span>
      <span className="text-xl">
        Gu<span className="text-brand-600">Spot</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV.slice(1).map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/propietarios/publicar/"
            className="hidden rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100 sm:inline-flex md:ml-2"
          >
            Publicá tu cochera
          </Link>
        </div>
      </header>

      {/* Barra inferior para celulares */}
      <nav
        aria-label="Principal (móvil)"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid h-16 grid-cols-4">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    active ? "text-brand-700" : "text-ink-500"
                  }`}
                >
                  <Icon width={22} height={22} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
