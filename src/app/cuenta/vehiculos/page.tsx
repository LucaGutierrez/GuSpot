import type { Metadata } from "next";
import { VehiclesPage } from "@/components/account/verification";

export const metadata: Metadata = { title: "Mis vehículos" };

export default function VehiculosPage() {
  return <VehiclesPage />;
}
