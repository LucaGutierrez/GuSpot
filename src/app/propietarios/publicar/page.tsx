import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/card";
import { PublishWizardFromParams } from "@/components/owner/publish-wizard/publish-wizard";

export const metadata: Metadata = {
  title: "Publicar un espacio",
  description: "Demo del asistente para publicar una cochera en GuSpot.",
};

export default function PublishPage() {
  return (
    <Container className="pb-12">
      <Suspense fallback={<p className="py-10 text-center text-ink-500">Cargando el asistente…</p>}>
        <PublishWizardFromParams />
      </Suspense>
    </Container>
  );
}
