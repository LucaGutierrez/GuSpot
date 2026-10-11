# Seguridad

Auditoría del 2026-10-11. No hay seguridad absoluta: esto es lo verificado dentro del alcance revisado y lo que queda pendiente.

## Modelo

- **Activos:** datos personales (DNI, fecha de nacimiento, celular), fotos de DNI/selfie/licencia, licencias y seguros, direcciones privadas de garajes, reservas y pagos, tokens de Mercado Pago de cada garaje, claves de Didit y Mercado Pago.
- **Límites de confianza:** el navegador no es de confianza. Todo lo que importa lo decide la base (reglas por fila, permisos por columna, funciones `security definer`) o las Edge Functions (claves secretas). El estado de un pago se toma siempre de la API de Mercado Pago.
- **Atacantes considerados:** anónimos, usuarios con cuenta que intentan ver o tocar datos ajenos, bots, abuso de acciones con costo (SMS, verificación, pagos), sitios externos (CSRF/clickjacking), dependencias.

## Controles verificados

| Control | Cómo se verificó |
|---|---|
| Sin claves secretas en el código, el historial de Git ni el sitio publicado (solo la clave *publishable*, pública por diseño) | Búsqueda en todo el historial y en `out/` |
| Todas las tablas con reglas por fila; un anónimo no lee datos privados | `npm run test:security` + pedidos reales sin sesión a la API (REST, Storage, funciones) |
| Nadie ve ni modifica datos de otra persona (IDOR), ni se marca verificado/pagado, ni se adueña de un garaje | `npm run test:security` |
| Documentos de identidad en un depósito privado; cada persona solo su carpeta | `npm run test:security` + listado anónimo real |
| Sin inyección SQL (consultas parametrizadas en PostgREST y funciones); sin HTML inyectable (React escapa; los marcadores del mapa usan `textContent`) | Revisión de código + prueba |
| Redirecciones solo a rutas internas (`safeNext`) o dominios permitidos (Didit, Mercado Pago) | Revisión de código |
| Encabezados: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP (`public/_headers`) | `curl -I` al sitio publicado + prueba en navegador |
| Funciones del servidor: solo aceptan pedidos desde GuSpot (CORS), exigen sesión salvo el aviso de Mercado Pago | Pedidos reales desde otro origen |
| Límites de uso en acciones con costo y en el aviso de pago (`rate_limit_hit`) | `npm run test:security` |
| Una sola reserva esperando el pago por conductor (no se pueden acaparar lugares) | `npm run test:security` |

## Pendientes (fuera del código o a decidir)

| Prioridad | Qué | Dónde |
|---|---|---|
| Alta | Contraseña mínima de 8 caracteres también en el servidor (hoy solo lo exige la página) | Supabase → Authentication → Providers → Email |
| Alta | CAPTCHA en registro e ingreso contra bots (Cloudflare Turnstile, gratis) | Supabase → Authentication → Bot protection + cambio en la página |
| Media | Firma de los avisos de Mercado Pago (`x-signature`) | Panel de Mercado Pago → Webhooks + función |
| Media | Un DNI verificado por cuenta (hoy dos cuentas pueden usar el mismo DNI) | Decisión de producto |
| Media | Protección de contraseñas filtradas y MFA | Supabase (la primera requiere plan pago) |
| Baja | Limpieza periódica de `function_errors` y `rate_limits` | Tarea programada |
| Baja | ESLint arrastra `braces` con un aviso de seguridad (solo herramientas de desarrollo; no llega al sitio) | Actualizar cuando Next publique la corrección |
| Info | La sesión se guarda en el navegador (estándar de Supabase); la CSP reduce el riesgo de XSS, pero un sitio estático necesita `'unsafe-inline'` | — |
| Info | El mapa usa la instancia pública de OpenFreeMap, sin garantía de servicio | Antes del lanzamiento |

## Si se filtra una clave

- **Supabase secreta / service role:** Project Settings → API Keys → rotar; actualizar los secretos de las funciones.
- **Didit:** business.didit.me → API keys → revocar y crear otra; `npx supabase secrets set DIDIT_API_KEY=…`.
- **Mercado Pago (Client Secret):** panel de la aplicación → renovar credenciales; `scripts/set-mp-secret.ps1`. Los tokens de los garajes se invalidan desconectando y reconectando.

## Pruebas

`npm run test:security` levanta un Postgres en memoria (PGlite) con todas las migraciones y prueba los ataques de arriba. No toca la base real.
