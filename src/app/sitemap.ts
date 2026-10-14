import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Sitio estático: sitemap.xml se genera al compilar.
export const dynamic = "force-static";

/** Páginas públicas para Google (las fichas de garajes se abren con ?id= y las encuentra desde el mapa). */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/como-funciona/", priority: 0.8 },
    { path: "/publicar/", priority: 0.8 },
    { path: "/terminos/", priority: 0.3 },
    { path: "/privacidad/", priority: 0.3 },
  ];
  return pages.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority }));
}
