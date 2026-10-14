import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Sitio estático: robots.txt se genera al compilar.
export const dynamic = "force-static";

/** Google puede mostrar las páginas públicas; las de cuenta, reservas y paneles quedan afuera. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/cuenta/",
        "/mis-garages/",
        "/mis-reservas/",
        "/reserva/",
        "/aviso/",
        "/verificacion/",
        "/ingresar/",
        "/crear-cuenta/",
        "/recuperar/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
