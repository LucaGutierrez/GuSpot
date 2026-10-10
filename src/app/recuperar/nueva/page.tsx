import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/account/recover-forms";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function NuevaClavePage() {
  return <NewPasswordForm />;
}
