import type { Metadata } from "next";
import { MyRealBookingsPage } from "@/components/bookings/booking-views";

export const metadata: Metadata = {
  title: "Mis reservas",
  description: "Tus reservas de garajes.",
};

export default function MisReservasPage() {
  return <MyRealBookingsPage />;
}
