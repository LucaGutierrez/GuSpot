# Decisiones pendientes

Decisiones abiertas que **toma el usuario**. Acá solo hay contexto y opciones; salvo las marcadas **DECIDIDA**, ninguna está elegida.
Mientras no se decidan, la interfaz las muestra como "a definir".

## Ya decidido (referencia)

Argentina, ARS, zona `America/Argentina/Buenos_Aires` · aprobación manual del propietario · precio por hora con tarifa diaria opcional y mínimo de horas · código de reserva para confirmar llegada y verificar (no abre cerraduras), visible solo para conductor y propietario de una reserva confirmada · Mercado Pago y tarjetas obligatorios para el lanzamiento público · búsqueda por ciudad y barrio · mapa en la demo con MapLibre GL JS + instancia pública de OpenFreeMap (solo demo, ver `mapas.md`) · decisiones de mapa del 2026-10-09 (puntos 21, 23, 24 y 25 abajo) · stack: Next.js + Prisma + PostgreSQL + Auth.js (email y contraseña) + Zod.

## Producto y reglas

### 1. Regla de cálculo del precio
Propuesta en `src/lib/pricing.ts`: redondeo hacia arriba a horas enteras; cada 24 h completas a tarifa diaria; horas restantes por hora con tope de una tarifa diaria.
Preguntas abiertas:
- Redondeo: ¿hora completa, media hora o minuto?
- Si la duración es menor al mínimo: ¿se rechaza (hoy) o se cobra el mínimo?
- Tarifa diaria: ¿por bloque de 24 h (hoy) o por día calendario?
- ¿Tarifas distintas por franja o día (noche, fin de semana)?

### 2. Ventana del código de reserva
Propuesta: desde 2 h antes del inicio hasta el fin. Opciones: otra anticipación; extender un margen después del fin; cómo se verifica (el propietario ingresa el código, o el conductor lo muestra y el propietario marca "llegó").

### 3. Política de cancelación
Sin definir. Opciones típicas: cancelación gratis hasta X horas antes; reintegro parcial; sin reintegro. También: qué pasa si cancela el propietario (penalidad, reubicación), y si hace falta un estado de "no se presentó".

### 4. Plazo de respuesta del propietario
¿Cuánto tiempo tiene para aprobar o rechazar antes de que la solicitud expire? Opciones: plazo fijo (p. ej. horas), relativo al inicio de la reserva, o el menor de ambos. Afecta `expiresAt` y una tarea programada que expire solicitudes.

### 5. ¿Una solicitud retiene el horario?
- A: la solicitud bloquea el horario hasta que se responda o expire (el conductor no puede perder el lugar, pero un propietario lento bloquea a otros).
- B: se aceptan varias solicitudes para el mismo horario; al aprobar una, las demás se rechazan o expiran automáticamente.

### 6. Momento del cobro con aprobación manual
- A: cobro al solicitar (o reserva/autorización del monto si el medio lo permite) y reembolso si se rechaza o expira.
- B: cobro después de la aprobación: estado `aprobada_pendiente_pago` con plazo para pagar; si no paga, expira.
Afecta la máquina de estados (ver `modelo-de-datos.md` §4.2) y la experiencia del conductor.

### 7. Comisiones y distribución de pagos
Quién cobra (la plataforma y luego liquida, o el propietario directamente vía modelo marketplace/split de Mercado Pago), cuánto (al conductor, al propietario o ambos), cuándo se liquida al propietario. Se define después, pero antes del lanzamiento.

### 8. Verificación de propietarios y documentación requerida
Qué se pide para publicar (identidad, titularidad o permiso para usar la cochera, reglamento del edificio), quién revisa y si una publicación queda "en revisión" antes de aparecer.

### 9. Datos del conductor y del vehículo
¿Se pide patente? ¿Teléfono? Cada dato personal debe tener un motivo (Ley 25.326). ¿Verificación de identidad del conductor?

### 10. Reseñas y calificaciones
La demo muestra `rating` de ejemplo. ¿Habrá reseñas? ¿Quién califica a quién? ¿Moderación?

### 11. Cobertura geográfica inicial
¿En qué ciudades se lanza? Afecta el catálogo de provincias/ciudades/barrios.

## Legal y fiscal (requiere asesoramiento profesional)

### 12. Términos y condiciones
Responsabilidad de la plataforma frente a daños, robos o incumplimientos; relación entre plataforma, propietario y conductor.

### 13. Datos personales (Ley 25.326)
Política de privacidad, finalidad y plazo de conservación de cada dato, derechos de acceso/rectificación/supresión, registro de bases de datos si corresponde.

### 14. Facturación (ARCA)
Quién factura a quién (comisión de la plataforma, alquiler del propietario), condición fiscal de cada parte, retenciones de Mercado Pago.

## Técnico (las decide el coordinador con el usuario)

### 15. Hosting de la demo
Vercel Hobby (restricción "non-commercial personal use only") o Cloudflare Free. Ver `publicacion.md`.

### 16. Hosting de producción y base de datos
Requiere funciones de servidor y PostgreSQL gestionado; es uso comercial (plan pago). Proveedor y costo a elegir.

### 17. Integración de Mercado Pago
Checkout Pro (redirección) o Checkout Bricks (embebido). Ver `arquitectura.md` §6.

### 18. Almacenamiento de fotos
Proveedor, tamaño máximo, moderación de contenido.

### 19. Notificaciones
Email transaccional (solicitud recibida, aprobada, recordatorio), proveedor y, más adelante, WhatsApp/push.

### 20. Representación de montos en la base
`BigInt` en centavos o `Decimal` en pesos (no `Int` de 32 bits). Ver `modelo-de-datos.md` §3.8.

## Mapa (ver `mapas.md`)

### 21. Proveedor de mapas para la demo — DECIDIDA (2026-10-09)
OpenFreeMap (instancia pública). Según su documentación: uso comercial permitido, sin límite de vistas, sin SLA. Limitación anotada: sin garantía de disponibilidad. Se cambia en un solo archivo (`src/components/map/config.ts`) o con la variable de build `NEXT_PUBLIC_MAP_STYLE_URL` (estilo compatible con MapLibre; si usa clave, queda visible en el navegador → clave restringida por dominio). Ver `mapas.md` §1 y §4.1.

### 22. Proveedor de mapas para producción — ABIERTA
La instancia pública de OpenFreeMap no tiene SLA y puede discontinuarse sin aviso. Hace falta un proveedor con condiciones comerciales y SLA, o self-hosting. Opciones: plan pago de MapTiler o Stadia (sus planes gratuitos no permiten uso comercial), self-hosting (OpenFreeMap o Protomaps con PMTiles) o Google Maps Platform (implica reescribir el componente de mapa). Comparativa en `mapas.md` §7.

### 23. Ubicación pública de las cocheras — DECIDIDA (2026-10-09)
- Punto aproximado desplazado de forma estable 100–200 m (`approximatePoint`, hash del id del espacio).
- La dirección exacta se muestra al conductor cuando la reserva está **confirmada y pagada** (o sea, después del pago cuando haya pagos reales). En la demo (sin pagos) queda oculta.
- En producción el desplazamiento se calcula en el servidor y la coordenada exacta nunca se envía al navegador antes de ese momento. En la demo los puntos "exactos" son ficticios y están en el código.
Ver `mapas.md` §6 y `modelo-de-datos.md` §3.7.

### 24. Página principal — DECIDIDA (2026-10-09)
La búsqueda en el mapa es la pantalla principal en celular y escritorio (`/`). El contenido del antiguo inicio pasa a `/como-funciona/`. `/buscar/` queda como alias que redirige a `/` conservando la búsqueda.

### 25. Zona inicial y ubicación del conductor — DECIDIDA (2026-10-09)
- Zona inicial: la última zona buscada (guardada en el navegador de la persona, `localStorage`, solo como comodidad) o CABA si no buscó ninguna.
- Nunca se pide la ubicación automáticamente; hay un botón para usar la del dispositivo. En la demo queda en memoria, no se guarda ni se envía.
- Los datos de la Ciudad usan "CABA" y la búsqueda acepta "Buenos Aires" / "Capital Federal" como sinónimos.
- Sigue abierto para producción: si la ubicación del dispositivo se envía al servidor (p. ej. "cerca mío" en el backend), si se guarda y cuánto tiempo, y cómo se informa en la política de privacidad (Ley 25.326, con asesoramiento; ver punto 13).

### 26. Búsqueda por dirección / geocodificación — ABIERTA
Hoy solo ciudad y barrio. Buscar o autocompletar direcciones requiere un proveedor de geocodificación (condiciones, límites y costo propios). También sirve para que el propietario ubique su cochera al publicar.
