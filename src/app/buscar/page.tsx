import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader } from "@/components/ui/card";
import { SearchResults } from "@/components/driver/search-results";

export const metadata: Metadata = {
  title: "Buscar cocheras",
  description: "Resultados de búsqueda de cocheras (datos de demostración).",
};

export default function BuscarPage() {
  return (
    <Container className="pb-10">
      <PageHeader
        title="Buscar cocheras"
        subtitle="Elegí zona y horario. Ves el precio total antes de solicitar."
      />
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults />
      </Suspense>
    </Container>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando resultados">
      <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-ink-100" />
      ))}
    </div>
  );
}
