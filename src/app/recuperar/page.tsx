import type { Metadata } from "next";
import { RequestResetForm } from "@/components/account/recover-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return <RequestResetForm />;
}
