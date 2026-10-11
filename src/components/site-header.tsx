"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InfoIcon, ParkingIcon, SearchIcon, TicketIcon, UserIcon } from "./ui/icons";
import { useAuth } from "@/lib/auth/auth-provider";

// El mapa de búsqueda es la pantalla principal ("/").
const isAccount = (p: string) =>
  ["/cuenta", "/ingresar", "/crear-cuenta", "/recuperar"].some((r) => p.startsWith(r));

const NAV = [
  { href: "/", label: "Buscar", icon: SearchIcon, match: (p: string) => p === "/" || p.startsWith("/buscar") || p.startsWith("/espacio") },
  { href: "/mis-reservas/", label: "Mis reservas", icon: TicketIcon, match: (p: string) => p.startsWith("/mis-reservas") },
  { href: "/mis-garages/", label: "Mis garajes", icon: ParkingIcon, match: (p: string) => p.startsWith("/mis-garages") || p.startsWith("/publicar") },
  { href: "/como-funciona/", label: "Cómo funciona", icon: InfoIcon, match: (p: string) => p.startsWith("/como-funciona"), desktopOnly: true },
  { href: "/cuenta/", label: "Cuenta", icon: UserIcon, match: isAccount, mobileOnly: true },
];

/** Botón de cuenta del encabezado (escritorio). */
function AccountButton() {
  const auth = useAuth();
  if (auth.status === "disabled" || auth.status === "loading") return null;
  if (auth.status === "signed-out") {
    return (
      <Link href="/ingresar/" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        Ingresar
      </Link>
    );
  }
  return (
    <Link
      href="/cuenta/"
      className="flex max-w-48 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
    >
      <UserIcon width={18} height={18} className="shrink-0" />
      <span className="truncate">{auth.user.displayName}</span>
    </Link>
  );
}

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
      <header data-app-chrome className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV.filter((item) => !item.mobileOnly).map((item) => {
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
          <div className="flex items-center gap-1">
            <div className="hidden md:block">
              <AccountButton />
            </div>
            <Link
              href="/publicar/"
              className="hidden rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100 sm:inline-flex md:ml-2"
            >
              Publicar un espacio
            </Link>
          </div>
        </div>
      </header>

      {/* Barra inferior para celulares */}
      <nav
        aria-label="Principal (móvil)"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid h-16 grid-cols-4">
          {NAV.filter((item) => !item.desktopOnly).map((item) => {
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
