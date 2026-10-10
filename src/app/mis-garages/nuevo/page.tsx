import type { Metadata } from "next";
import { NewGaragePage } from "@/components/my-garages/my-garages";

export const metadata: Metadata = { title: "Publicá tu garage" };

export default function NuevoGaragePage() {
  return <NewGaragePage />;
}
