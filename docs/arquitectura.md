# Arquitectura

## 1. Hoy: demo estática

```
Navegador ──▶ archivos estáticos (out/) en un CDN
               └─ HTML pre-generado + JS de React
                  └─ datos: src/lib/demo-data.ts (embebidos en el build)
```

- Next.js 16 (App Router) con `output: "export"`, `trailingSlash: true`, `images.unoptimized` (`next.config.ts`).
- Sin servidor, sin base de datos, sin cuentas, sin pagos. Todo lo "interactivo" (búsqueda, cotización, verificación de disponibilidad) corre en el navegador sobre datos de ejemplo.
- Rutas dinámicas con `generateStaticParams` + `dynamicParams = false`: se genera una página por cada espacio de ejemplo.
- Prohibido en esta etapa: server actions, route handlers dinámicos, cookies, headers, rewrites, `next/image` optimizado (ver `AGENTS.md`).

## 2. Estructura de carpetas

```
src/
  app/                    rutas (App Router)
    layout.tsx            COMPARTIDO: layout raíz, DemoBanner, header/footer
    globals.css           COMPARTIDO: Tailwind v4 y paleta (brand-*, accent-*, ink-*)
    page.tsx              inicio
    <seccion>/            POR SECCIÓN: cada agente trabaja en la carpeta que le asigna el coordinador
  components/
    ui/                   COMPARTIDO: Badge, Button, Card, DemoNotice/DemoBanner, íconos, SpacePhoto
    site-header.tsx       COMPARTIDO
    site-footer.tsx       COMPARTIDO
  lib/                    COMPARTIDO: dominio y utilidades
    types.ts              tipos de dominio
    demo-data.ts          datos de ejemplo (se reemplaza por la base)
    pricing.ts            cotización (regla propuesta, pendiente de confirmar)
    availability.ts       horario semanal + superposición
    search.ts             búsqueda por ciudad/barrio
    datetime.ts, format.ts  fechas de pared argentinas, ARS, etiquetas
docs/                     documentación
public/                   archivos estáticos
```

**Compartido** (solo lo edita el coordinador): `src/lib/**`, `src/components/ui/**`, `src/components/site-*.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, configuración (`next.config.ts`, `package.json`, `tsconfig.json`, `eslint.config.mjs`).
**Por sección**: la carpeta de la ruta y sus componentes propios, asignada a un agente.

## 3. Objetivo: etapas

| Etapa | Qué agrega | Cambios técnicos |
|---|---|---|
| 0. Demo estática (actual) | Navegación con datos de ejemplo | — |
| 1. Cuentas y datos reales | Registro/login, publicar espacios, buscar sobre la base | Quitar `output: "export"`. PostgreSQL + Prisma, Auth.js (email y contraseña), Zod. Hosting con funciones de servidor. |
| 2. Reservas reales sin cobro | Solicitar, aprobar/rechazar, código de reserva con ventana | Máquina de estados en el servidor, exclusion constraint, `AccessCode` cifrado, tareas programadas (expirar/completar). Ver `modelo-de-datos.md`. |
| 3. Pagos (requisito del lanzamiento) | Mercado Pago y tarjetas | `PaymentProvider`, webhooks, `aprobada_pendiente_pago` (según el momento del cobro). |
| 4. Lanzamiento público | — | Políticas y aspectos legales definidos, quitar banner de demo. Ver checklist del README. |
| Después | Mapa, fotos reales, mensajes, reseñas | A definir. |

Las etapas 1 y 2 pueden probarse en privado; **no** se abren al público sin la etapa 3.

## 4. Cómo se reemplaza `demo-data` por la base

Hoy las pantallas importan funciones de `src/lib/demo-data.ts` y `src/lib/search.ts`. Para que el cambio sea acotado:

1. **Capa de acceso a datos** en `src/lib/` (p. ej. `src/lib/data/`) con funciones con nombre de dominio, no de tabla: `getSpace(id)`, `searchSpaces(params)`, `listBookingsForDriver(userId)`, `listBookingsForOwner(userId)`, etc. En la demo devuelven datos de `demo-data.ts`; en la etapa 1 consultan Prisma. Las pantallas no importan `demo-data.ts` directamente.
2. **Tipos estables**: `src/lib/types.ts` describe lo que ve la UI (DTOs). Prisma tiene sus propios tipos; se mapean en la capa de datos (p. ej. `BigInt` → `number`, `timestamptz` → `LocalDateTime` en hora argentina).
3. **Validación con Zod** en el borde (formularios, parámetros de URL, webhooks). Los mismos esquemas en cliente y servidor.
4. **Funciones puras reutilizables**: `quote()`, `overlaps()`, `describeAvailability()` siguen sirviendo. `checkAvailability()` se complementa con la verificación en la base (la UI es orientativa; la base decide).
5. **Autorización en el servidor**: dirección exacta y código de reserva nunca se envían al navegador si el usuario no corresponde, aunque la UI no los muestre.
6. **Mutaciones**: server actions o route handlers (permitidos recién al quitar `output: "export"`), cada una con transacción y verificación de estado.

## 5. Pagos: interfaz futura (no implementada)

Objetivo: que el dominio no dependa de Mercado Pago directamente.

```ts
// Borrador. NO existe en el código.
export interface PaymentProvider {
  readonly id: "mercadopago";

  /** Crea la intención de cobro y devuelve a dónde mandar al conductor (Checkout Pro)
   *  o los datos para inicializar el formulario embebido (Bricks). */
  createCheckout(input: {
    bookingId: string;
    amount: number;          // centavos
    currency: "ARS";
    description: string;
    payerEmail: string;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; redirectUrl?: string; clientConfig?: unknown }>;

  /** Valida firma y origen de un webhook y devuelve el evento normalizado (sin confiar en el cuerpo). */
  parseWebhook(req: { headers: Headers; rawBody: string; query: URLSearchParams }):
    Promise<{ eventId: string; topic: string; resourceId: string } | null>;

  /** Consulta el estado real del pago en la API del proveedor. */
  getPayment(providerPaymentId: string): Promise<{
    status: PaymentStatus;   // normalizado al enum propio
    statusDetail?: string;
    amount: number;
  }>;

  refund(providerPaymentId: string, amount?: number): Promise<{ providerRefundId: string }>;
}
```

Flujo esperado: crear `Payment(pendiente)` → `createCheckout` → el conductor paga en Mercado Pago → webhook → `parseWebhook` (firma) → registrar `PaymentWebhookEvent` (idempotente) → `getPayment` → actualizar `Payment` y, si corresponde, la reserva. Nunca confirmar una reserva por la URL de retorno del checkout: solo por el estado consultado al proveedor.

## 6. Requisitos previos para integrar Mercado Pago

Lo hace el **usuario** (no se inventan credenciales ni cuentas):

1. **Cuenta de Mercado Pago** del titular del negocio y una **aplicación** creada en el panel de desarrolladores de Mercado Pago.
2. **Credenciales de prueba** (para desarrollo) y **de producción** (para el lanzamiento). Se cargan como variables de entorno en el hosting; nunca en el repo ni en el código del navegador (salvo la *public key*, que es pública por diseño).
3. **Usuarios de prueba** de Mercado Pago para simular comprador y vendedor.
4. **Elegir integración**:
   - **Checkout Pro**: redirige al sitio de Mercado Pago; menos código y menos datos sensibles en nuestras páginas.
   - **Checkout Bricks**: componentes embebidos en nuestras páginas; más control visual. Los datos de tarjeta los tokeniza el SDK de Mercado Pago; igual revisar condiciones del hosting (ver `publicacion.md`, cláusula de Cloudflare sobre datos de tarjeta en planes Free).
5. **Webhooks**: URL pública **HTTPS** del backend registrada en el panel; validar la firma (header `x-signature`, HMAC con la clave secreta de la aplicación, junto con `x-request-id` y el `data.id`); responder 200/201 rápido (Mercado Pago documenta un plazo de 22 s y reintentos) y procesar de forma idempotente. Fuente: [Webhooks — Mercado Pago Developers](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks) (consultado 09/10/2026).
6. **Nunca almacenar datos de tarjeta** (número, CVV, vencimiento). Solo IDs del proveedor.
7. **Pendientes de negocio** antes de integrar: momento del cobro, comisiones y distribución al propietario (cobro como marketplace / split), reembolsos y cancelaciones, facturación (ARCA). Ver `decisiones-pendientes.md`.
