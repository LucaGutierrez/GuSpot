# Arquitectura

```
Celular / navegador
  └─ sitio estático (Next.js exportado, Cloudflare Pages)
       ├─ Supabase (clave publishable)
       │    ├─ Postgres: tablas + reglas por fila + funciones (supabase/migrations)
       │    ├─ Auth: email y contraseña con confirmación
       │    ├─ Storage: fotos de garajes y de perfil (públicas), documentos (privados)
       │    ├─ Realtime: avisos "Voy a este" en el panel del garaje
       │    └─ Edge Functions (claves secretas)
       │         ├─ didit        → identidad (DNI + cara) y SMS del celular
       │         └─ mercadopago  → conectar garajes (OAuth), cobrar, devolver
       ├─ OpenFreeMap (mapa) · Georef / Photon (direcciones)
       └─ Google Maps / Waze / Mapas de Apple (enlaces de navegación)
```

## Principios

- **El sitio es estático.** No hay servidor propio: el navegador habla con Supabase. Prohibido en Next: server actions, route handlers, cookies, `next/image` con optimización. Rutas con id por query (`/espacio/?id=`).
- **La seguridad está en la base.** Las reglas por fila, los permisos por columna y las funciones `security definer` deciden quién ve y hace qué. La página nunca tiene claves secretas.
- **Todo lo sensible pasa por funciones de la base** (`create_booking`, `notify_arrival`, `missing_requirements`, …) o por las Edge Functions (Didit, Mercado Pago). El estado de un pago se toma siempre de la API de Mercado Pago, nunca del aviso.

## Datos principales

| Tabla | Qué guarda |
|---|---|
| `garages`, `garage_private`, `garage_photos` | Garajes (lo público), dirección e indicaciones (privado), fotos |
| `profiles`, `vehicles`, `identity_checks` | Datos personales, licencia, vehículos con seguro, verificaciones |
| `bookings` | Reservas con su pago (estado de reserva y de pago por separado) |
| `arrival_notices` | Avisos "Voy a este" |
| `mp_accounts` | Cuentas de Mercado Pago conectadas (solo el servidor) |
| `app_settings` | Reglas configurables: cargo de servicio, minutos de devolución, exigencias de verificación |
| `function_errors` | Errores de las Edge Functions, para diagnosticar |

## Código

| Carpeta | Contenido |
|---|---|
| `src/lib/data/` | Acceso a Supabase: garajes, reservas, avisos, perfil, pagos |
| `src/lib/` | Fechas en hora argentina, precios, búsqueda, disponibilidad en vivo, geocodificación |
| `src/components/explore/` | Mapa de búsqueda (pantalla principal) |
| `src/components/real-space/` | Ficha del garaje |
| `src/components/bookings/`, `arrivals/` | Reservas y avisos de llegada |
| `src/components/my-garages/` | Publicar, editar y panel del garaje |
| `src/components/account/` | Cuenta, verificación, vehículos, cobros |
| `src/components/map/` | Mapa (MapLibre); el proveedor se cambia en `map/config.ts` |
| `src/components/ui/` | Botones, tarjetas, íconos y piezas comunes |
