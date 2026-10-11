import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingDetailPage } from "@/components/bookings/booking-views";

export const metadata: Metadata = { title: "Tu reserva" };

// Detalle de una reserva real: `/reserva/?id=` (con query porque el sitio es estático).
export default function ReservaPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <BookingDetailPage />
    </Suspense>
  );
}
