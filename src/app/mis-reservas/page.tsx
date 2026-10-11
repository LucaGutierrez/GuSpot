import type { Metadata } from "next";
import { DEMO_DRIVER_NAME } from "@/lib/demo-data";
import { DemoBadge } from "@/components/ui/badge";
import { Container, PageHeader } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";
import { MyBookings } from "@/components/driver/my-bookings";
import { MyRealBookingsPage } from "@/components/bookings/booking-views";
import { isBackendConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Mis reservas",
  description: "Tus reservas de cocheras.",
};

export default function MisReservasPage() {
  // Con cuentas reales: las reservas de verdad. En modo demo: las de ejemplo.
  if (isBackendConfigured) return <MyRealBookingsPage />;
  return (
    <Container className="max-w-3xl pb-12">
      <PageHeader
        title="Mis reservas"
        subtitle={`Viendo la cuenta de ejemplo “${DEMO_DRIVER_NAME}”.`}
      >
        <DemoBadge label="Reservas de ejemplo" />
      </PageHeader>
      <div className="mb-6">
        <DemoNotice>
          Estas reservas son de ejemplo. Las solicitudes que hagas en la demo no se guardan, no se
          envían a ningún propietario y no se procesan pagos.
        </DemoNotice>
      </div>
      <MyBookings />
    </Container>
  );
}
