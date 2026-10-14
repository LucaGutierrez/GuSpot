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
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const DESCRIPTION =
  "GuSpot: encontrá garajes cerca tuyo en toda la Argentina con lugares libres en vivo. Avisá que vas o reservá pagando una seña desde el celular.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "GuSpot — Estacionamiento cerca, con precio claro", template: "%s · GuSpot" },
  description: DESCRIPTION,
  // Visible en Google (decisión del usuario 2026-10-14). Las pantallas privadas se excluyen en robots.ts.
  robots: { index: true, follow: true },
  // Dirección principal: la misma página en guspotapp.com (evita duplicados con guspot-demo.pages.dev).
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "GuSpot",
    locale: "es_AR",
    url: "./",
    title: "GuSpot — Estacionamiento cerca, con precio claro",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  applicationName: "GuSpot",
  // Abierta desde la pantalla de inicio del iPhone: sin la barra de Safari.
  appleWebApp: { capable: true, title: "GuSpot", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2453e0",
  // Usa toda la pantalla (los bordes con "notch" y la barra de inicio se respetan con safe-area).
  viewportFit: "cover",
};

// La dirección interna de Cloudflare (guspot-demo.pages.dev) lleva al dominio
// guspotapp.com, en la misma página. Las versiones de prueba (<id>.guspot-demo.pages.dev)
// no se tocan. Texto fijo: no incluye nada que venga de la persona.
const MAIN_DOMAIN_REDIRECT =
  'if(location.hostname==="guspot-demo.pages.dev")location.replace("https://guspotapp.com"+location.pathname+location.search+location.hash)';

export default function RootLayout({ children }: LayoutProps<"/">) {
  // El mapa es la pantalla principal: abrimos antes la conexión a su proveedor.
  preconnect(MAP_ORIGIN, { crossOrigin: "anonymous" });
  return (
    <html lang="es-AR" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MAIN_DOMAIN_REDIRECT }} />
      </head>
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
