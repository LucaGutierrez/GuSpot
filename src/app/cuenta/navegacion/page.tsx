import type { Metadata } from "next";
import { NavigationAppPage } from "@/components/account/account-panel";

export const metadata: Metadata = { title: "App para ir" };

export default function NavegacionPage() {
  return <NavigationAppPage />;
}
