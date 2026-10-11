import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DemoBanner } from "@/components/ui/demo-notice";
import { ChromeHeight } from "@/components/chrome-height";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { preconnect } from "react-dom";
import { MAP_ORIGIN } from "@/components/map/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "GuSpot — Estacionamiento cerca, con precio claro", template: "%s · GuSpot" },
  description:
    "GuSpot: encontrá garages cerca tuyo en CABA con lugares libres en vivo. Avisá que vas o reservá y pagá desde el celular.",
  robots: { index: false, follow: false },
  applicationName: "GuSpot",
  // Abierta desde la pantalla de inicio del iPhone: sin la barra de Safari.
  appleWebApp: { capable: true, title: "GuSpot", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2453e0",
  // Usa toda la pantalla (los bordes con "notch" y la barra de inicio se respetan con safe-area).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // El mapa es la pantalla principal: abrimos antes la conexión a su proveedor.
  preconnect(MAP_ORIGIN, { crossOrigin: "anonymous" });
  return (
    <html lang="es-AR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="pb-safe-nav flex min-h-full flex-col font-sans">
        <AuthProvider>
          <DemoBanner />
          <SiteHeader />
          <ChromeHeight />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
