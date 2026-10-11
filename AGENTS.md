<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GuSpot — convenciones del proyecto

GuSpot es una plataforma (Argentina, ARS, por ahora CABA) para encontrar garajes cerca, avisar que vas
o reservar y pagar. **Estado actual (2026-10-11): versión en desarrollo con datos reales** (Supabase,
garajes comerciales, reservas, pagos con Mercado Pago). Los datos y pantallas de ejemplo de la demo
original se sacaron a pedido del usuario: no volver a agregarlos.

## Reglas de producto (no negociables)
- Nunca mostrar una reserva como pagada si Mercado Pago no aprobó el pago, ni insinuar que algo funciona si no está conectado (p. ej. emails/SMS pendientes).
- El estado de la reserva (`BookingStatus`) y el del pago (`PaymentStatus`) se muestran siempre por separado.
- La dirección escrita y las indicaciones solo las ve el conductor con reserva **confirmada y pagada** o con un aviso "Voy a este".
- Nunca mencionar otras apps en la interfaz.
- La búsqueda NO tiene horario por defecto: se busca por zona/cerca y el horario se elige al reservar ("Desde ahora: 1–4 h" u otro día).
- No inventar políticas de cancelación, verificación de propietarios ni requisitos legales: mostrarlos como "a definir".
- Interfaz en español rioplatense (voseo: "buscá", "publicá").
- Se escribe **"garaje" / "garajes" (con J)** en todo texto visible (pedido explícito del usuario). En el código quedan los nombres internos `garage` (tablas, rutas `/mis-garages/`, componentes): no renombrarlos, la ruta `/mis-garages/cobros/` está registrada en Mercado Pago.

## Técnica
- Next.js 16 App Router, exportación estática (`output: "export"`, `trailingSlash: true`). Prohibido: server actions, route handlers dinámicos, cookies, headers, rewrites, `next/image` con optimización.
- Rutas con id: por query (`/espacio/?id=`), porque el sitio es estático.
- `useSearchParams` solo en componentes cliente envueltos en `<Suspense>`.
- Estilos con Tailwind v4 y la paleta de `src/app/globals.css` (`brand-*`, `accent-*`, `ink-*`). Mobile-first; la barra de navegación inferior existe en móvil.
- Montos en centavos (`formatARS`), fechas como `LocalDateTime` "YYYY-MM-DDTHH:mm" hora argentina (`src/lib/datetime.ts`, `src/lib/format.ts`).

## Comandos
- `npm run dev` — desarrollo. `npm run build` — genera `out/`. `npm run lint`.

## Mapa
- Biblioteca: MapLibre GL JS (`maplibre-gl`, BSD-3). Mapas base: instancia pública de OpenFreeMap (sin clave, sin SLA): **sin SLA: revisar antes del lanzamiento**. Ver docs/mapas.md.
- El worker de MapLibre se copia a `public/vendor/` con `predev`/`prebuild` (scripts/copy-map-worker.mjs).
- Contrato entre el mapa y las pantallas: `src/components/map/types.ts` .
- `Space.coords` es el punto PÚBLICO. Garajes reales: desde 2026-10-10 es el punto EXACTO (decisión del usuario; migración 20261010130000).
- Proveedor de mapas: solo en `src/components/map/config.ts` (o `NEXT_PUBLIC_MAP_STYLE_URL`).
- Al abrir el mapa sin búsqueda explícita se busca primero **cerca de la persona** (~2 km): si ya dio permiso, directo; si no, se explica antes de que el navegador pregunte; si dice "Ahora no", no se vuelve a ofrecer solo (localStorage `guspot:ubicacion`). Sin ubicación: la última zona buscada (`src/lib/last-zone.ts`) o CABA.
- "Buscar en esta zona": al mover el mapa se ofrece buscar dentro del rectángulo visible (`MapViewProps.onUserMove`, `searchSpaces(..., area)`).
- La búsqueda en el mapa es la pantalla principal (`/`). Alto disponible bajo banner+encabezado: variable CSS `--app-top`.
- Barra inferior móvil: alto en la variable CSS `--mobile-nav-height`.

## Etapa 1: cuentas y garajes reales (Supabase)
- Backend: Supabase (Postgres + Auth + Storage). El sitio sigue siendo ESTÁTICO: el navegador (y la futura app móvil) habla directo con Supabase usando la clave **publishable**; la seguridad la imponen las reglas RLS y los permisos de columnas de `supabase/migrations/`. Nunca usar claves secretas en el cliente.
- Configuración: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (`src/lib/supabase/config.ts`). Sin ellas (`isBackendConfigured === false`) las pantallas explican que la copia no está conectada al servidor.
- Sesión: `useAuth()` de `src/lib/auth/auth-provider.tsx` (`disabled | loading | signed-out | signed-in`). Acciones: `src/lib/auth/actions.ts`.
- Datos reales: contrato en `src/lib/data/types.ts` , implementación en `src/lib/data/garages.ts`.
- La búsqueda muestra los garajes publicados (`src/components/explore/space-source.tsx`).
- Dirección del garaje: se escribe y se elige de sugerencias (Georef de datos.gob.ar, respaldo Photon/OSM; `src/lib/geocoding.ts`, sin clave). El pin se puede ajustar en el mapa y hay enlace a Google Maps. Google Maps Platform descartado por ahora (exige tarjeta).
- Datos privados (dirección escrita, indicaciones de llegada) solo los ve el propietario; el conductor, con reserva confirmada (etapa de reservas). El punto del mapa es público y exacto.
- Rutas reales: `/ingresar/`, `/crear-cuenta/`, `/recuperar/`, `/recuperar/nueva/`, `/cuenta/`, `/mis-garages/`, `/mis-garages/nuevo/`, `/mis-garages/editar/?id=`, `/espacio/?id=` (detalle de garaje real; ruta con query porque el sitio es estático). `/mis-reservas/` muestra las reservas reales. `/como-funciona/` explica el producto actual.

## Etapa 2 (en prueba): reservas reales
- Decisión del usuario (2026-10-10): **reserva instantánea** (si el horario está libre se confirma sola, sin aprobación del dueño). En el producto real se **paga al reservar** (tarjetas y Mercado Pago); la cancelación con reembolso tendrá unos minutos de gracia (a definir).
- Fase actual SIN pagos: `payment_status` = `no_disponible`; cancelar es libre hasta la hora de entrada. Nunca mostrar una reserva como pagada.
- Base: `supabase/migrations/20261010140000_bookings.sql`. Todo por funciones: `create_booking` (valida horario, superposición —constraint de exclusión— y calcula el precio igual que `src/lib/pricing.ts`), `cancel_booking`, `busy_periods` (ocupación pública, sin datos personales), `booking_access` (dirección + indicaciones + punto exacto solo para el conductor de una reserva confirmada).
- Cliente: `src/lib/data/bookings.ts`; pantallas en `src/components/bookings/**`, rutas `/reserva/?id=` y `/mis-reservas/` (con Supabase muestra las reales). El dueño ve "Reservas de tus garajes" en `/mis-garages/`.
- Avisos por email: pendientes (requieren un proveedor de email, p. ej. Resend).

## Seguridad e identidad (2026-10-10)
- Para **reservar**: datos personales (18+), fotos del DNI (frente/dorso), selfie, licencia vigente (datos + fotos) y al menos un vehículo. Para **publicar**: datos personales, DNI y selfie. Lo controla la base (`missing_requirements`, migración 20261010150000).
- Fotos en el bucket PRIVADO `identity-docs` ("<user_id>/dni-frente|dni-dorso|selfie|licencia-frente|licencia-dorso"); nunca se muestran a otros usuarios. Pantalla: `/verificacion/` (`src/components/account/verification.tsx`), datos en `src/lib/data/profile.ts`.
- `profiles.identity_status` y `phone_verified` los cambia solo el sistema (sin permiso de escritura del usuario). Pendiente: comparación automática cara-DNI con prueba de vida (Didit), SMS, código de llegada, calificaciones. Aspectos legales (Ley 25.326): a confirmar con un abogado, no inventar.
- En cada reserva el dueño ve nombre, marca, modelo, color y patente (copia en `bookings`).
- **Seguro y licencia** (pedido del usuario 2026-10-11, migración 20261011210000): cada vehículo tiene compañía, póliza y vencimiento del seguro; para reservar o avisar "Voy a este" el vehículo elegido tiene que tener el seguro vigente (`vehicle_insured`, error `insurance_missing`; requisito `seguro`). El garaje ve el seguro (copia `car_insurance` en `bookings` y `arrival_notices`). El número de licencia tiene que ser igual al del DNI (requisito `licencia_dni`).
- **Identidad con Didit** (2026-10-11): `supabase/functions/didit` (Edge Function, Deno) crea la sesión (DNI + prueba de vida + comparación de cara) y consulta el resultado; actualiza `profiles.identity_status` con la clave de servicio. Secretos en Supabase: `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` (nunca en el cliente). Al aprobar, el número del DNI escaneado tiene que coincidir con el cargado. Para reservar y publicar se exige `identity_status = 'verificada'` (migración 20261011120000). Cambiar nombre, DNI o fecha de nacimiento anula la verificación.

## Lanzamiento con garajes comerciales (2026-10-11)
- Se lanza con **garajes comerciales** (`garages.kind = 'comercial'`); las **cocheras particulares** son etapa 2: en `/publicar/` figuran como "Próximamente" y la base no deja publicarlas. La búsqueda muestra solo comerciales.
- Dos recorridos: **Buscar** (mapa, `/`) y **Publicar un espacio** (`/publicar/` → formulario comercial `/mis-garages/nuevo/`). El formulario comercial no pide auto ni datos de cochera particular.
- **Disponibilidad en vivo**: `capacity`, `available_spots` (null = no informa número), `availability_state` (disponible/pocos/sin_lugar/cerrado), `accepting_drivers`, `availability_updated_at` (lo pone la base). Se muestra siempre con texto + color (`src/lib/live.ts`, `components/garage/live-badge.tsx`); dato viejo a los 30 min (`STALE_MINUTES`).
- **Panel del operador**: `/mis-garages/panel/?id=` (+/– lugares, estados, pausar, avisos en tiempo real).
- **"Voy a este"**: aviso de llegada (`arrival_notices`, `notify_arrival`, `update_arrival`, `arrival_access`), NO reserva lugar y se dice siempre. Pantalla `/aviso/?id=`. El garaje lo recibe por Supabase Realtime con el panel abierto (email/SMS/push: pendiente).
- **Reservas** en garajes comerciales: hasta `reservable_spots` superpuestas (lo controla `create_booking` con el garaje bloqueado).
- Marcadores de garaje: "Nombre · $X/h" con punto de disponibilidad (`MapMarker.variant = "garage"`, `tone`).
- Requisitos: conductor = datos + identidad + licencia + vehículo (también para "Voy a este"); quien publica = datos + identidad + **celular verificado** (`profiles.phone_verified`, código por SMS con Didit). La exigencia del celular se prende/apaga con `app_settings.require_phone_verification` (migración 20261011150000); prendida (ver Pagos).
- Precio por demanda y reseñas: NO implementados (sin datos de demanda ni forma de verificar visitas todavía).

## Pagos con Mercado Pago (2026-10-11)
- Decisiones del usuario: la plata va **directo al garaje** (modelo marketplace: cada garaje conecta su cuenta por OAuth y Mercado Pago divide el pago; GuSpot cobra `marketplace_fee`). La comisión es un **cargo de servicio que paga el conductor** encima de la tarifa (10 %, configurable). **Devolución total hasta 10 min después de pagar**; después se puede cancelar pero sin devolución (se avisa claro).
- Configuración en `app_settings` (`service_fee_percent`, `refund_window_minutes`, `payment_hold_minutes`); la página la lee con `payment_settings()`.
- Base: migración `20261011160000_mercadopago.sql`. `create_booking` deja la reserva `pendiente_pago` y guarda el lugar `payment_hold_minutes` (`hold_until`); solo garajes con Mercado Pago conectado (`garages.online_payments`, lo mantiene el sistema). Tokens en `mp_accounts` (sin acceso del cliente).
- Servidor: Edge Function `supabase/functions/mercadopago` (publicada con `--no-verify-jwt` por el aviso de pago; controla la sesión adentro). Secretos: `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_TEST_MODE`. El estado del pago se toma SIEMPRE de la API de Mercado Pago, nunca del aviso.
- Cliente: `src/lib/data/payments.ts`; pantallas: panel de reserva (tarifa + cargo + total), `/reserva/?id=` (pagar, confirmar al volver, cancelar con/sin devolución), `/cuenta/cobros/` (Tu cuenta → Cobros con Mercado Pago: conectar la cuenta). `/mis-garages/cobros/` es solo la URL de vuelta registrada en Mercado Pago y redirige a `/cuenta/cobros/`.
- Pasos para activarlo: `docs/pagos.md`.
- Aplicación de Mercado Pago "GuSpot" (n.º 5830580745068087), creada 2026-10-11, en MODO PRUEBA (`MP_TEST_MODE=true`). Para guardar el Client Secret: `scripts/set-mp-secret.ps1` (lo lee del portapapeles).
- Interruptores `app_settings.require_phone_verification` y `app_settings.require_identity_verification`: **prendidos** de nuevo el 2026-10-11 (migración 20261011200000). Con el celular exigido, nadie puede publicar hasta cargar saldo en Didit (o cambiar de proveedor de SMS).
- Prueba real de pagos hecha el 2026-10-11: pago aprobado, reserva confirmada y devolución OK. Ojo: Mercado Pago no devuelve si el garaje no tiene saldo disponible (error 2031); la plata de un cobro tarda en liberarse.
