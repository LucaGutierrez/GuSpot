<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GuSpot — convenciones del proyecto

GuSpot es una plataforma (Argentina, ARS) para buscar y reservar cocheras ofrecidas por propietarios.
**Estado actual: demo estática navegable con datos de ejemplo.** No hay base de datos, cuentas,
reservas reales, pagos, mapas, mensajes ni carga de fotos.

## Reglas de producto (no negociables)
- Todo dato de ejemplo debe verse como tal (usar `DemoBadge`, `DemoNotice`; el `DemoBanner` ya está en el layout).
- Nunca mostrar una reserva como pagada ni insinuar que Mercado Pago, tarjetas, mapas, mensajes o carga de fotos funcionan.
- El estado de la reserva (`BookingStatus`) y el del pago (`PaymentStatus`) se muestran siempre por separado. En la demo el pago es siempre `no_disponible`.
- Códigos de reserva: nunca mostrar un código con apariencia real. Solo conductor y propietario de una reserva **confirmada**, dentro de una ventana horaria (propuesta: desde 2 h antes del inicio hasta el fin). En la demo se muestra enmascarado/explicado.
- La dirección exacta solo se muestra al conductor cuando la reserva está **confirmada y pagada**. En la demo (sin pagos) nunca se muestra: usar `approxLocation` y el punto aproximado del mapa.
- No inventar políticas de cancelación, verificación de propietarios ni requisitos legales: mostrarlos como "a definir".
- Interfaz en español rioplatense (voseo: "buscá", "publicá").

## Técnica
- Next.js 16 App Router, exportación estática (`output: "export"`, `trailingSlash: true`). Prohibido: server actions, route handlers dinámicos, cookies, headers, rewrites, `next/image` con optimización.
- Rutas dinámicas: `generateStaticParams` + `export const dynamicParams = false`. Tipar props como `{ params: Promise<{ id: string }> }`.
- `useSearchParams` solo en componentes cliente envueltos en `<Suspense>`.
- Estilos con Tailwind v4 y la paleta de `src/app/globals.css` (`brand-*`, `accent-*`, `ink-*`). Mobile-first; la barra de navegación inferior existe en móvil.
- Montos en centavos (`formatARS`), fechas como `LocalDateTime` "YYYY-MM-DDTHH:mm" hora argentina (`src/lib/datetime.ts`, `src/lib/format.ts`).
- Código compartido (solo lo edita el coordinador): `src/lib/**`, `src/components/ui/**`, `src/components/site-*.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, configuración.

## Comandos
- `npm run dev` — desarrollo. `npm run build` — genera `out/`. `npm run lint`.

## Mapa
- Biblioteca: MapLibre GL JS (`maplibre-gl`, BSD-3). Mapas base: instancia pública de OpenFreeMap (sin clave, sin SLA): **solo apta para la demo**. Ver docs/mapas.md.
- El worker de MapLibre se copia a `public/vendor/` con `predev`/`prebuild` (scripts/copy-map-worker.mjs).
- Contrato entre el mapa y las pantallas: `src/components/map/types.ts` (lo mantiene el coordinador).
- `Space.coords` es el punto PÚBLICO: desplazado 100–200 m de forma estable (`approximatePoint` en src/lib/geo.ts). Las distancias calculadas con él son aproximadas ("≈").
- Proveedor de mapas: solo en `src/components/map/config.ts` (o `NEXT_PUBLIC_MAP_STYLE_URL`).
- Zona inicial: la última buscada (`src/lib/last-zone.ts`, localStorage) o CABA. Nunca pedir ubicación automáticamente.
- La búsqueda en el mapa es la pantalla principal (`/`). Alto disponible bajo banner+encabezado: variable CSS `--app-top`.
- Barra inferior móvil: alto en la variable CSS `--mobile-nav-height`.

## Etapa 1: cuentas y garages reales (Supabase)
- Backend: Supabase (Postgres + Auth + Storage). El sitio sigue siendo ESTÁTICO: el navegador (y la futura app móvil) habla directo con Supabase usando la clave **publishable**; la seguridad la imponen las reglas RLS y los permisos de columnas de `supabase/migrations/`. Nunca usar claves secretas en el cliente.
- Configuración: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (`src/lib/supabase/config.ts`). Sin ellas: **modo demo** (`isBackendConfigured === false`), todo debe seguir funcionando con datos de ejemplo y las pantallas de cuenta explican que no hay cuentas.
- Sesión: `useAuth()` de `src/lib/auth/auth-provider.tsx` (`disabled | loading | signed-out | signed-in`). Acciones: `src/lib/auth/actions.ts`.
- Datos reales: contrato en `src/lib/data/types.ts` (lo mantiene el coordinador), implementación en `src/lib/data/garages.ts`.
- `Space.source` ("demo" | "real"): garages de ejemplo y reales NUNCA se mezclan en la misma lista/mapa; los de ejemplo siempre con etiqueta "Ejemplo".
- Datos privados (dirección exacta, punto exacto) solo los ve el propietario. El punto público se calcula en la base (100–200 m, estable).
- Rutas reales: `/ingresar/`, `/crear-cuenta/`, `/recuperar/`, `/recuperar/nueva/`, `/cuenta/`, `/mis-garages/`, `/mis-garages/nuevo/`, `/mis-garages/editar/?id=`, `/espacio/?id=` (detalle de garage real; ruta con query porque el sitio es estático). Las pantallas de demo (`/propietarios/**`, `/espacios/[id]/`, `/mis-reservas/`) se conservan como demostración.
- Fuera de alcance en esta etapa: reservas reales, pagos, Mercado Pago, comisiones, códigos de llegada, app nativa.
