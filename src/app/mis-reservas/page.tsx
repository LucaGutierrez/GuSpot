import type { Metadata } from "next";
import { MyRealBookingsPage } from "@/components/bookings/booking-views";

export const metadata: Metadata = {
  title: "Mis reservas",
  description: "Tus reservas de garages.",
};

export default function MisReservasPage() {
  return <MyRealBookingsPage />;
}
