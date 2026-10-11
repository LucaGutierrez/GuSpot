# Supabase

El navegador habla directo con Supabase con la clave **publishable**; la seguridad está en `supabase/migrations/` (reglas por fila, permisos por columna y funciones).

## Puesta en marcha (proyecto nuevo)

1. Crear el proyecto (región São Paulo).
2. Aplicar **todas** las migraciones de `supabase/migrations/`, en orden.
3. **Authentication → Email**: activado, con confirmación de email.
4. **Authentication → URL Configuration**: Site URL = la URL publicada; Redirect URLs = `http://localhost:3000/**` y `https://<dominio>/**`.
5. Copiar la URL y la clave `sb_publishable_…` a `.env.local`. **Nunca** la `sb_secret_…`.
6. Publicar las funciones `didit` y `mercadopago` y cargar sus secretos ([publicación](publicacion.md), [pagos](pagos.md)).

## Quién ve qué

| Dato | Quién lo ve |
|---|---|
| Garaje publicado (nombre, precio, horario, lugares, punto del mapa) | Todos |
| Dirección escrita e indicaciones de llegada | El dueño; el conductor con reserva pagada o con aviso "Voy a este" |
| Datos personales, licencia, vehículos | La propia persona; el garaje ve nombre, foto, vehículo y seguro de quien reserva o avisa |
| Fotos de DNI, selfie y licencia (bucket privado) | Solo la propia persona |
| Tokens de Mercado Pago | Solo el servidor |

## Requisitos (`missing_requirements`)

- **Conductor** (reservar o "Voy a este"): datos personales (18+), identidad verificada, licencia vigente con el número del DNI, al menos un vehículo con seguro vigente.
- **Quien publica**: datos personales, identidad verificada y celular verificado.
- Las exigencias de identidad y celular se pueden apagar para pruebas en `app_settings` (`require_identity_verification`, `require_phone_verification`).
