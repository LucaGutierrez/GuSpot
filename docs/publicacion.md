# Publicación

El sitio es estático: `npm run build` genera `out/` y `npm run deploy` lo sube a **Cloudflare Pages** (proyecto `guspot-demo`, dominio https://guspotapp.com; también responde en https://guspot-demo.pages.dev).

## Publicar

1. `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). Se incluyen en el build: solo la clave **publishable**, nunca la secreta.
2. `npm run deploy` (pide iniciar sesión en Cloudflare la primera vez: `npx wrangler login`).

## Cambios en la base y en las funciones

- Migraciones nuevas en `supabase/migrations/` (en orden por fecha). Aplicarlas con la CLI de Supabase:
  `npx supabase db query --linked --project-ref <ref> -f supabase/migrations/<archivo>.sql`
- Funciones: `npx supabase functions deploy <didit|mercadopago> --project-ref <ref> --use-api`
  (`mercadopago` además con `--no-verify-jwt`, porque Mercado Pago avisa los pagos sin sesión).
- Secretos (nunca en el código): `npx supabase secrets set --project-ref <ref> NOMBRE=valor`.
  El Client Secret de Mercado Pago se carga con `scripts/set-mp-secret.ps1` (lo lee del portapapeles).

## A tener en cuenta

- La ubicación del celular y la instalación como app requieren HTTPS (Cloudflare ya lo da).
- El mapa usa la instancia pública de OpenFreeMap, sin garantía de servicio: revisar antes del lanzamiento ([mapas](mapas.md)).
- Antes del lanzamiento: dominio propio, términos y privacidad revisados por un abogado, registro de la marca en el INPI.
