"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Lleva los enlaces viejos de /buscar/ a la búsqueda en el mapa ("/"), con la misma query. */
export function RedirectToSearch() {
  const router = useRouter();
  const query = useSearchParams().toString();
  const href = `/${query ? `?${query}` : ""}`;

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return <SearchLink href={href} />;
}

export function SearchLink({ href = "/" }: { href?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-ink-700">La búsqueda ahora está en la pantalla principal.</p>
      <Link
        href={href}
        className="mt-3 inline-flex font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        Ir a la búsqueda
      </Link>
    </div>
  );
}
