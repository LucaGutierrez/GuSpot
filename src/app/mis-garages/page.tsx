import type { Metadata } from "next";
import { MyGaragesPage } from "@/components/my-garages/my-garages";

export const metadata: Metadata = { title: "Mis garages" };

export default function MisGaragesPage() {
  return <MyGaragesPage />;
}
