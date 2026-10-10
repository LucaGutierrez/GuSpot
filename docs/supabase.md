# Supabase (Etapa 1: cuentas y garages reales)

El sitio sigue siendo estático: el navegador habla directo con Supabase con la clave
**publishable**. La seguridad está en `supabase/migrations/` (RLS + permisos por columna).

## Puesta en marcha

1. Crear un proyecto en supabase.com (región: São Paulo, la más cercana).
2. **SQL Editor** → pegar y ejecutar `supabase/migrations/20261009120000_garages.sql`
   (o, con la CLI: `npx supabase link` + `npx supabase db push`).
3. **Authentication → Providers → Email**: activado, con "Confirm email" activado.
4. **Authentication → URL Configuration**:
   - Site URL: la URL publicada (Cloudflare Pages).
   - Redirect URLs: `http://localhost:3000/**` y `https://<dominio>/**`.
5. **Project Settings → API Keys**: copiar la URL y la clave `sb_publishable_…` a `.env.local`
   (ver `.env.example`). **Nunca** la `sb_secret_…`.
6. `npm run dev`: con las variables definidas se activan las cuentas; sin ellas, modo demo.

## Qué protege la base

| Dato | Quién lo ve | Quién lo escribe |
|---|---|---|
| `garages` (título, precio, disponibilidad, punto público…) | Todos, si está `publicado`; el dueño siempre | El dueño (sin `owner_id`, `public_*` ni fechas) |
| `garage_private` (dirección y punto exactos) | Solo el dueño | Solo el dueño (sin el desplazamiento) |
| `garage_photos` + bucket `garage-photos` | Fotos de garages visibles (URLs públicas) | El dueño; máx. 6, JPG/PNG/WebP, 5 MB |

- **Punto público**: lo calcula la base al guardar el punto exacto, desplazado 100–200 m con un
  ángulo y distancia aleatorios fijados una vez por garage (estable y no deducible del id).
- **Publicar** exige ubicación, al menos una franja de disponibilidad y precio por hora > 0
  (lo valida un trigger; el cliente muestra el mensaje).
- Las URLs de fotos son públicas aunque el garage esté en borrador (nombres aleatorios, no listables).

## Pendiente de verificar con un proyecto real

La migración se escribió sin un Postgres a mano: hay que correrla una vez y probar con dos
cuentas que una no ve la dirección ni puede editar los garages de la otra.

## Pantallas de la etapa 1

| Ruta | Qué hace |
|---|---|
| `/crear-cuenta/`, `/ingresar/`, `/recuperar/`, `/recuperar/nueva/` | Alta con confirmación por email, ingreso y recuperación de contraseña. Aceptan `?volver=<ruta interna>`. |
| `/cuenta/` | Nombre, cambio de contraseña, cerrar sesión. |
| `/mis-garages/` | Garages propios con estado (borrador / publicado / pausado). |
| `/mis-garages/nuevo/` | Alta (queda en borrador). Punto exacto marcado en el mapa. |
| `/mis-garages/editar/?id=` | Edición, fotos (hasta 6), publicar/pausar, eliminar. |
| `/espacio/?id=` | Detalle público de un garage real publicado (sin reservas todavía). |

**Búsqueda (`/`)**: con Supabase configurado muestra solo los garages reales publicados (para
todos, con o sin cuenta); sin Supabase, solo los de ejemplo. Al abrir, busca primero cerca de la
persona si da su ubicación; al mover el mapa ofrece "Buscar en esta zona".

**Dirección del garage**: se busca por calle y altura (Georef, API oficial y gratuita de
datos.gob.ar; respaldo Photon/OpenStreetMap). Ver `src/lib/geocoding.ts`.

**Publicar el sitio**: `npm run deploy:demo` compila con lo que haya en `.env.local`. Con las
variables de Supabase definidas, el sitio publicado tendrá cuentas y garages reales.
