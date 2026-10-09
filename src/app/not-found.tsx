import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Container className="max-w-xl py-20 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">No encontramos esta página</h1>
      <p className="mt-2 text-ink-500">Puede que el espacio no exista en los datos de demostración.</p>
      <ButtonLink href="/" className="mt-6">
        Volver al inicio
      </ButtonLink>
    </Container>
  );
}
