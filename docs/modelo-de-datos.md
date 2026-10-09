# Modelo de datos — revisión para la etapa real

Revisión de `src/lib/types.ts` (y de cómo lo usan `pricing.ts`, `availability.ts`, `search.ts`, `datetime.ts` y `demo-data.ts`) pensando en la etapa con base de datos.
Stack aprobado: **Next.js + Prisma + PostgreSQL + Auth.js (email y contraseña) + Zod**.

> Este documento es un **borrador de diseño**. No hay archivos Prisma en el repo y nada de esto está implementado.
> Todo lo que depende de decisiones abiertas está marcado **[PENDIENTE]** (ver `decisiones-pendientes.md`).

---

## 1. Qué está bien y conviene conservar

- **Montos en centavos enteros** (`Centavos`): evita errores de redondeo. Se mantiene (ver tamaño del entero en §3.8).
- **Estado de reserva y estado de pago separados** (`BookingStatus` / `PaymentStatus`): es la base correcta. En la etapa real se separan además en **tablas** distintas.
- **`totalPrice` congelado al solicitar**: correcto en intención; hay que ampliarlo a un snapshot completo (§3.5).
- **`approxLocation`** separado de la dirección: buena base para no exponer la dirección exacta antes de confirmar.
- **Intervalos semiabiertos** `[inicio, fin)`: `overlaps()` usa `<` estricto, así que una reserva que termina 12:00 no choca con otra que empieza 12:00. Se mantiene igual en PostgreSQL con `tstzrange(..., '[)')`.
- **`quote()` y `checkAvailability()` como funciones puras**: se pueden reutilizar del lado del servidor sin cambios grandes.

## 2. Qué falta (resumen)

| Falta | Por qué importa |
|---|---|
| `User` con roles (conductor / propietario / admin; una persona puede ser varios) | Hoy `Booking` guarda `driverName` y `Owner` está aislado: no se puede autorizar nada. |
| `AccessCode` cifrado, con ventana de validez, y auditoría `AccessCodeEvent` | El código solo lo ven conductor y propietario de una reserva confirmada, dentro de una ventana (propuesta: 2 h antes del inicio hasta el fin). |
| `Payment` separado de `Booking`, con sus propios estados, y registro de webhooks | Mercado Pago es requisito del lanzamiento; un pago puede tener varios intentos, reembolsos, contracargos. |
| `AvailabilityBlock` (bloqueos manuales del propietario) | Hoy `Space.busy` mezcla bloqueos y reservas en datos fijos. |
| `AvailabilityRule` como tabla | Hoy es un array JSON dentro del espacio. |
| Historial de estados de reserva (`BookingStatusChange`) | Saber quién aprobó/rechazó/canceló y cuándo; necesario para soporte y disputas. |
| Snapshot de precio completo | Hoy solo `totalPrice`; la regla de cálculo está **pendiente** y puede cambiar. |
| Catálogo de ubicaciones (provincia / ciudad / barrio) e índices | La búsqueda es por ciudad y barrio; hoy es texto libre con `includes`. |
| Restricción anti-superposición en la base | Dos aprobaciones simultáneas no pueden ocupar el mismo horario. |
| Timestamps con zona (`timestamptz`) | Hoy `createdAt` es hora de pared sin zona. |
| `Vehicle`, `SpacePhoto`, dirección exacta privada | Hoy el vehículo es texto libre y las fotos son ilustraciones. |

## 3. Diseño propuesto

### 3.1 Usuarios y roles

- `User` único con `roles Role[]` (enum de PostgreSQL en array). Un mismo usuario puede ser conductor y propietario.
- `OwnerProfile` 1:1 opcional con datos del propietario. **[PENDIENTE]** qué verificación y documentación se exige; el modelo deja un `verificationStatus` sin reglas asociadas.
- Email guardado en minúsculas con índice único (o `citext`).
- Contraseña: solo hash (argon2id o bcrypt), nunca el valor. Auth.js con proveedor de credenciales; agregar los modelos que pida `@auth/prisma-adapter` en su versión vigente (verificar en su documentación al implementar).
- Ley 25.326: guardar lo mínimo (nombre, email, teléfono opcional). **[PENDIENTE]** textos legales y política de privacidad.

### 3.2 Fechas y zona horaria

- **Instantes** (cuándo pasó algo, inicio/fin de reserva) → `DateTime @db.Timestamptz(3)` en PostgreSQL, siempre en UTC internamente.
- **Hora de pared** (`LocalDateTime` "YYYY-MM-DDTHH:mm") → se conserva como formato de **entrada/salida** de la UI y de la API. La conversión a instante se hace en el servidor con la zona del espacio (`America/Argentina/Buenos_Aires`) usando la base de zonas (tz database), **no** sumando un offset fijo `-03:00`. Argentina no tiene horario de verano hoy, pero lo tuvo (2007–2009); si vuelve, el modelo sigue funcionando.
- **Reglas semanales** (`AvailabilityRule`) son hora de pared: `weekday` + `startMinute` / `endMinute` (0–1440) interpretados en la zona del espacio.
- `Space.timezone` con default `America/Argentina/Buenos_Aires`, aunque hoy sea siempre la misma.

### 3.3 Disponibilidad y anti-superposición

Un horario está ocupado si se superpone con: (a) una reserva en un estado que **retiene** el lugar, o (b) un `AvailabilityBlock`.

- Estados que retienen: `confirmada` y, cuando existan pagos, `aprobada_pendiente_pago`. **[PENDIENTE]** si una `solicitada` retiene el lugar (o si se permiten varias solicitudes para el mismo horario y al aprobar una se rechazan/expiran las demás).
- **Garantía en la base**: exclusion constraint de PostgreSQL (requiere `btree_gist`). Prisma no la modela; va en una migración SQL manual:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Columna generada con el rango [inicio, fin)
ALTER TABLE "Booking"
  ADD COLUMN "period" tstzrange
  GENERATED ALWAYS AS (tstzrange("startAt", "endAt", '[)')) STORED;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist ("spaceId" WITH =, "period" WITH &&)
  WHERE ("status" IN ('confirmada', 'aprobada_pendiente_pago'));

ALTER TABLE "Booking" ADD CONSTRAINT booking_valid_range CHECK ("endAt" > "startAt");
```

  En Prisma la columna se declara como `period Unsupported("tstzrange")?` para que `prisma migrate` no la borre.
  Si el enum `BookingStatus` se agrega después de la constraint, recrearla al sumar `aprobada_pendiente_pago`.
- **Bloqueos vs. reservas**: una exclusion constraint solo compara filas de la misma tabla. Dos opciones (decide el coordinador):
  1. Al aprobar, en una transacción: `SELECT ... FROM "Space" WHERE id = $1 FOR UPDATE`, verificar bloqueos, actualizar la reserva. La constraint queda como red de seguridad entre reservas.
  2. Tabla única `Occupancy` (reservas que retienen + bloqueos) con la exclusion constraint; las reservas escriben/borran su fila al cambiar de estado. Más robusto, más código.
- Validaciones de reglas: `startMinute < endMinute`, múltiplos de 30 (hoy `checkAvailability` muestrea cada 30 min; una regla de 07:15 daría resultados incorrectos). Franjas que cruzan medianoche se guardan partidas en dos reglas.

### 3.4 Código de reserva (`AccessCode`)

Sirve para **confirmar llegada y verificar la reserva**. No abre cerraduras.

- Se genera al pasar a `confirmada`. 1:1 con `Booking`.
- Guardar **cifrado** (AES-256-GCM, clave en variable de entorno, nunca en el repo) para poder mostrarlo, más un **hash HMAC** para verificar sin descifrar.
- `validFrom` / `validUntil` calculados al confirmar (propuesta: inicio − 2 h → fin). **[PENDIENTE]** confirmar la ventana.
- `revokedAt` si la reserva se cancela.
- Autorización (en el servidor, nunca solo en la UI): solo `booking.driverId` o `booking.ownerId`, reserva `confirmada` y `now ∈ [validFrom, validUntil]`.
- `AccessCodeEvent`: `generado`, `visto` (por quién), `verificado`, `verificacion_fallida`, `revocado`. Limitar intentos de verificación por reserva/usuario. Guardar lo mínimo (sin IP salvo que se justifique; Ley 25.326).
- La referencia visible de la reserva (p. ej. `GS-7K3P9Q`) **no** es el código ni el `id` interno.

### 3.5 Snapshot de precio

Al crear la solicitud se congela en `Booking`:
`hourlyPrice`, `dailyPrice`, `minHours`, `billedHours`, `fullDays`, `remainingHours`, `subtotal`, `serviceFee` (null hasta definir comisiones), `total`, `currency = 'ARS'`, `pricingRuleVersion` (p. ej. `"2026-10-propuesta"`).
Así un cambio de tarifa o de regla no altera reservas existentes y queda trazable qué regla se aplicó. **[PENDIENTE]** regla definitiva (`src/lib/pricing.ts` es una propuesta).

### 3.6 Pagos

- `Payment` N:1 con `Booking` (puede haber varios intentos). Una reserva sin `Payment` es lo que hoy la UI muestra como `no_disponible`: **no es un estado de base de datos**.
- `provider = mercadopago`, `providerPaymentId` único, `providerPreferenceId`, `status`, `statusDetail`, `amount`, `currency`.
- `PaymentWebhookEvent` con `@@unique([provider, eventId])` para idempotencia: los webhooks se reintentan y pueden llegar desordenados. El estado se actualiza consultando la API del proveedor, no confiando en el cuerpo del webhook.
- `Refund` separado (montos parciales posibles).
- **Nunca** se guardan datos de tarjeta (ni número, ni CVV, ni vencimiento). Solo IDs del proveedor.
- **[PENDIENTE]** momento del cobro, comisiones, distribución al propietario (split / marketplace), facturación ARCA.

### 3.7 Ubicación y búsqueda

- `Province`, `City` (FK a provincia), `Neighborhood` (FK a ciudad), con `slug` normalizado (sin tildes, minúsculas). "Buenos Aires" hoy es ambiguo (CABA vs. provincia).
- `Space` referencia `cityId` y `neighborhoodId`. Dirección exacta (`addressLine`) en el espacio pero solo expuesta al conductor de una reserva confirmada (y al propietario). `lat`/`lng` opcionales para el mapa futuro.
- Índices: `@@index([status, cityId, neighborhoodId])`, `@@index([ownerId])`. Para texto libre ("Palermo", "cordoba"): extensiones `unaccent` + `pg_trgm` con índice GIN sobre el nombre (migración SQL manual).
- Reservas: el índice GiST de la exclusion constraint sirve para buscar superposiciones por espacio; agregar `@@index([driverId, startAt])` y `@@index([ownerId, status, startAt])` para las bandejas.

### 3.8 Tamaño de los montos

`Int` de Prisma es 32 bits: tope 2.147.483.647 centavos ≈ **$ 21,4 millones**. Con inflación, estadías largas o totales acumulados (liquidaciones) lo pueden superar. Propuesta: `BigInt` en la base para montos y conversión a `number` en el borde (seguro hasta 2^53). Alternativa: `Decimal(14,2)` en pesos. Decide el coordinador; lo importante es no usar `Int`.

## 4. Máquinas de estado

### 4.1 Reserva — hoy (sin pagos)

```
                 propietario aprueba
  solicitada ─────────────────────────▶ confirmada ──(fin pasado, sistema)──▶ completada
     │  │  │                                │
     │  │  └─(conductor retira)──▶ cancelada ◀─(conductor/propietario) [política PENDIENTE]
     │  └─(propietario rechaza)──▶ rechazada
     └─(sin respuesta en plazo [PENDIENTE])──▶ expirada
```

Estados finales: `rechazada`, `expirada`, `cancelada`, `completada`.
Cada transición crea un `BookingStatusChange` (`from`, `to`, `actorId`, `actorRole`: conductor / propietario / sistema / admin, `reason`).
Transiciones válidas centralizadas en una sola función del servidor (tabla `ALLOWED[from] = [to...]`), con la actualización hecha como `UPDATE ... WHERE id = $1 AND status = $from` para evitar carreras.
**[PENDIENTE]** si hace falta `no_presentado` (conductor no llegó) o `en_curso` (puede derivarse del horario + código verificado).

### 4.2 Reserva — con pagos: dónde entra `aprobada_pendiente_pago`

Si el cobro es **después** de la aprobación (una de las opciones abiertas):

```
solicitada ──aprueba──▶ aprobada_pendiente_pago ──pago aprobado (webhook)──▶ confirmada ──▶ completada
                              │
                              ├─(vence plazo de pago [PENDIENTE])──▶ expirada
                              └─(conductor desiste)──────────────────▶ cancelada
```

- Se inserta **entre** `solicitada` y `confirmada`: la aprobación del propietario ya no confirma; confirma el pago aprobado.
- `aprobada_pendiente_pago` retiene el lugar (entra en la exclusion constraint) hasta que vence.
- El código de reserva se genera recién en `confirmada`.

Si el cobro es **al solicitar** (otra opción abierta): la reserva no pasa a `solicitada` hasta que el pago queda aprobado (o autorizado/reservado, si el medio lo permite), y un `rechazada`/`expirada` dispara un reembolso. En ese caso `aprobada_pendiente_pago` no se usa. **La elección es del usuario.**

### 4.3 Pago

Estados propuestos (mapeables a los que informa Mercado Pago; verificar la lista vigente al integrar):

```
pendiente ──▶ en_proceso ──▶ aprobado ──▶ reembolsado (total o parcial)
    │             │              └──────▶ contracargo
    │             └──▶ rechazado
    └──▶ cancelado / expirado
(en_mediacion: disputa abierta sobre un pago aprobado)
```

`no_disponible` queda solo como etiqueta de UI de la demo. Regla de la UI que se mantiene: estado de reserva y de pago siempre por separado.

## 5. Borrador de `schema.prisma`

> Borrador para discutir, **no** copiar sin revisar. Omite los modelos de Auth.js (`Account`, `Session`, `VerificationToken`), que se agregan según la versión del adapter.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  conductor
  propietario
  admin
}

enum OwnerVerificationStatus {
  no_verificado
  en_revision
  verificado
  rechazado
  // Reglas y documentación requeridas: PENDIENTE
}

enum SpaceType {
  cubierta
  semicubierta
  descubierta
}

enum VehicleSize {
  moto
  auto_chico
  auto_mediano
  camioneta
}

enum ListingStatus {
  borrador
  publicado
  pausado
  // ¿en_revision / suspendido? depende de la verificación de propietarios (PENDIENTE)
}

enum BookingStatus {
  solicitada
  aprobada_pendiente_pago // se usa solo si el cobro es posterior a la aprobación
  confirmada
  rechazada
  expirada
  cancelada
  completada
}

enum ActorRole {
  conductor
  propietario
  sistema
  admin
}

enum PaymentProvider {
  mercadopago
}

enum PaymentStatus {
  pendiente
  en_proceso
  aprobado
  rechazado
  cancelado
  expirado
  reembolsado
  reembolsado_parcial
  en_mediacion
  contracargo
}

enum AccessCodeEventType {
  generado
  visto
  verificado
  verificacion_fallida
  revocado
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique // guardar en minúsculas
  emailVerifiedAt DateTime? @db.Timestamptz(3)
  passwordHash    String
  name            String
  phone           String?
  roles           Role[]    @default([conductor])
  createdAt       DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime  @updatedAt @db.Timestamptz(3)

  ownerProfile     OwnerProfile?
  spaces           Space[]
  vehicles         Vehicle[]
  bookingsAsDriver Booking[]             @relation("DriverBookings")
  bookingsAsOwner  Booking[]             @relation("OwnerBookings")
  statusChanges    BookingStatusChange[]
  accessEvents     AccessCodeEvent[]
}

model OwnerProfile {
  userId             String                  @id
  user               User                    @relation(fields: [userId], references: [id])
  displayName        String
  verificationStatus OwnerVerificationStatus @default(no_verificado)
  createdAt          DateTime                @default(now()) @db.Timestamptz(3)
}

model Province {
  id     String @id @default(cuid())
  name   String
  slug   String @unique
  cities City[]
}

model City {
  id            String         @id @default(cuid())
  provinceId    String
  province      Province       @relation(fields: [provinceId], references: [id])
  name          String
  slug          String
  neighborhoods Neighborhood[]
  spaces        Space[]

  @@unique([provinceId, slug])
}

model Neighborhood {
  id     String  @id @default(cuid())
  cityId String
  city   City    @relation(fields: [cityId], references: [id])
  name   String
  slug   String
  spaces Space[]

  @@unique([cityId, slug])
}

model Space {
  id               String        @id @default(cuid())
  ownerId          String
  owner            User          @relation(fields: [ownerId], references: [id])
  title            String
  description      String
  cityId           String
  city             City          @relation(fields: [cityId], references: [id])
  neighborhoodId   String
  neighborhood     Neighborhood  @relation(fields: [neighborhoodId], references: [id])
  approxLocation   String        // visible antes de confirmar
  addressLine      String        // PRIVADA: solo conductor con reserva confirmada y propietario
  lat              Decimal?      @db.Decimal(9, 6) // mapa: más adelante
  lng              Decimal?      @db.Decimal(9, 6)
  timezone         String        @default("America/Argentina/Buenos_Aires")
  type             SpaceType
  maxVehicle       VehicleSize
  features         String[]      // o tabla/enum; validar con Zod
  accessConditions String[]
  currency         String        @default("ARS")
  hourlyPrice      BigInt        // centavos
  dailyPrice       BigInt?       // centavos
  minHours         Int
  status           ListingStatus @default(borrador)
  createdAt        DateTime      @default(now()) @db.Timestamptz(3)
  updatedAt        DateTime      @updatedAt @db.Timestamptz(3)

  photos   SpacePhoto[]
  rules    AvailabilityRule[]
  blocks   AvailabilityBlock[]
  bookings Booking[]

  @@index([status, cityId, neighborhoodId])
  @@index([ownerId])
}

model SpacePhoto {
  id         String @id @default(cuid())
  spaceId    String
  space      Space  @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  storageKey String // proveedor de almacenamiento: PENDIENTE
  caption    String?
  position   Int

  @@index([spaceId, position])
}

model AvailabilityRule {
  id          String @id @default(cuid())
  spaceId     String
  space       Space  @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  weekday     Int    // 0 = domingo … 6 = sábado (CHECK 0..6 en migración)
  startMinute Int    // 0..1439, múltiplo de 30
  endMinute   Int    // 1..1440 (1440 = medianoche), > startMinute

  @@index([spaceId, weekday])
}

model AvailabilityBlock {
  id          String   @id @default(cuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  startAt     DateTime @db.Timestamptz(3)
  endAt       DateTime @db.Timestamptz(3)
  reason      String?
  createdById String
  createdAt   DateTime @default(now()) @db.Timestamptz(3)

  @@index([spaceId, startAt])
}

model Vehicle {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  size        VehicleSize
  plate       String?     // dato personal: pedir solo si se decide que hace falta
  description String?
  bookings    Booking[]
}

model Booking {
  id        String        @id @default(cuid())
  reference String        @unique // visible, corta, no adivinable; NO es el código de reserva
  spaceId   String
  space     Space         @relation(fields: [spaceId], references: [id])
  driverId  String
  driver    User          @relation("DriverBookings", fields: [driverId], references: [id])
  ownerId   String        // snapshot del dueño al solicitar (autorización y bandejas)
  owner     User          @relation("OwnerBookings", fields: [ownerId], references: [id])
  vehicleId String?
  vehicle   Vehicle?      @relation(fields: [vehicleId], references: [id])
  startAt   DateTime      @db.Timestamptz(3)
  endAt     DateTime      @db.Timestamptz(3)
  // period tstzrange GENERATED + EXCLUDE USING gist: ver migración SQL manual
  period    Unsupported("tstzrange")?
  status    BookingStatus @default(solicitada)
  expiresAt DateTime?     @db.Timestamptz(3) // plazo de respuesta / de pago: PENDIENTE

  // Snapshot de precio (centavos)
  currency           String  @default("ARS")
  hourlyPrice        BigInt
  dailyPrice         BigInt?
  minHours           Int
  billedHours        Int
  fullDays           Int
  remainingHours     Int
  subtotal           BigInt
  serviceFee         BigInt? // comisiones: PENDIENTE
  total              BigInt
  pricingRuleVersion String

  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @db.Timestamptz(3)

  statusChanges BookingStatusChange[]
  accessCode    AccessCode?
  payments      Payment[]

  @@index([driverId, startAt])
  @@index([ownerId, status, startAt])
  @@index([spaceId, status])
}

model BookingStatusChange {
  id         String         @id @default(cuid())
  bookingId  String
  booking    Booking        @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  fromStatus BookingStatus?
  toStatus   BookingStatus
  actorId    String?        // null si actorRole = sistema
  actor      User?          @relation(fields: [actorId], references: [id])
  actorRole  ActorRole
  reason     String?
  createdAt  DateTime       @default(now()) @db.Timestamptz(3)

  @@index([bookingId, createdAt])
}

model AccessCode {
  id         String    @id @default(cuid())
  bookingId  String    @unique
  booking    Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  ciphertext String    // AES-256-GCM (iv + tag + datos), clave en variable de entorno
  codeHash   String    // HMAC para verificar sin descifrar
  validFrom  DateTime  @db.Timestamptz(3) // propuesta: inicio - 2 h (PENDIENTE)
  validUntil DateTime  @db.Timestamptz(3) // propuesta: fin
  revokedAt  DateTime? @db.Timestamptz(3)
  createdAt  DateTime  @default(now()) @db.Timestamptz(3)

  events AccessCodeEvent[]
}

model AccessCodeEvent {
  id           String              @id @default(cuid())
  accessCodeId String
  accessCode   AccessCode          @relation(fields: [accessCodeId], references: [id], onDelete: Cascade)
  type         AccessCodeEventType
  actorId      String?
  actor        User?               @relation(fields: [actorId], references: [id])
  createdAt    DateTime            @default(now()) @db.Timestamptz(3)

  @@index([accessCodeId, createdAt])
}

model Payment {
  id                   String          @id @default(cuid())
  bookingId            String
  booking              Booking         @relation(fields: [bookingId], references: [id])
  provider             PaymentProvider
  providerPaymentId    String?         // se conoce cuando el proveedor crea el pago
  providerPreferenceId String?         // Checkout Pro
  status               PaymentStatus   @default(pendiente)
  statusDetail         String?
  currency             String          @default("ARS")
  amount               BigInt          // centavos
  createdAt            DateTime        @default(now()) @db.Timestamptz(3)
  updatedAt            DateTime        @updatedAt @db.Timestamptz(3)
  // NUNCA datos de tarjeta.

  refunds Refund[]

  @@unique([provider, providerPaymentId])
  @@index([bookingId])
}

model Refund {
  id               String   @id @default(cuid())
  paymentId        String
  payment          Payment  @relation(fields: [paymentId], references: [id])
  providerRefundId String?
  amount           BigInt
  reason           String?
  createdAt        DateTime @default(now()) @db.Timestamptz(3)
}

model PaymentWebhookEvent {
  id          String          @id @default(cuid())
  provider    PaymentProvider
  eventId     String          // id de la notificación / x-request-id
  topic       String
  resourceId  String
  receivedAt  DateTime        @default(now()) @db.Timestamptz(3)
  processedAt DateTime?       @db.Timestamptz(3)
  error       String?

  @@unique([provider, eventId])
}
```

Migraciones SQL manuales a acompañar: `btree_gist` + columna `period` + exclusion constraint (§3.3), `CHECK` de reglas y rangos, `unaccent` + `pg_trgm` para búsqueda de texto.

## 6. Hallazgos para el coordinador

Problemas concretos en el código actual (solo lectura; no se tocó nada). Ordenados por importancia.

1. **La disponibilidad ignora las reservas confirmadas de la demo.** Todos los espacios tienen `busy: []`, pero `R-DEMO-1001` está `confirmada` en `palermo-cochera-cubierta` el 24/10 de 10:00 a 15:00. Una búsqueda para ese horario muestra el espacio como disponible. Sugerencia: calcular `busy` a partir de `bookings` con estado que retiene (`confirmada`) más bloqueos, p. ej. una función `occupiedIntervals(spaceId)` en `demo-data.ts` usada por `checkAvailability`.
2. **Dato inconsistente:** `R-DEMO-1003` tiene `vehicle: "Camioneta"` en `palermo-cochera-cubierta`, cuyo `maxVehicle` es `auto_mediano`. Además `Booking.vehicle` es una etiqueta de texto libre en vez de `VehicleSize`.
3. **`Booking` no tiene `driverId` ni `ownerId`**, solo `driverName`. No alcanza para la regla "el código solo lo ven conductor y propietario". Agregar `driverId` (y `ownerId` como snapshot) ya en los tipos de la demo ayuda a que las pantallas filtren por id y no por nombre (`DEMO_DRIVER_NAME`).
4. **`PaymentStatus` mezcla un concepto de UI (`no_disponible`) con estados reales** y le faltan estados que Mercado Pago informa (en proceso, cancelado, contracargo, mediación, reembolso parcial). Para la demo está bien; en la etapa real `no_disponible` = "no hay `Payment`".
5. **`BookingStatus` no tiene `aprobada_pendiente_pago`** (esperado), ni quién/por qué canceló, ni `expiresAt`. Sin historial de estados.
6. **`createdAt` es `LocalDateTime`** (hora de pared). Es un instante: en la etapa real, `timestamptz`.
7. **`rating` en `Space` sin modelo de reseñas** y con valores verosímiles (4.8, 4.9). Puede leerse como dato real; AGENTS.md pide que todo dato de ejemplo se vea como tal. Sugerencia: no mostrarlo, o mostrarlo con `DemoBadge`. Reseñas: decisión de producto pendiente.
8. **Snapshot de precio incompleto:** solo `totalPrice`. La regla está pendiente de confirmación; sin desglose ni versión no se puede explicar un total después.
9. **Ubicación en texto libre:** `city: "Buenos Aires"` es ambiguo (CABA vs. provincia); no hay provincia. `matchesZone` busca subcadenas ("centro" coincide con Córdoba y Rosario, lo que es correcto, pero no hay forma de desambiguar).
10. **Reglas de disponibilidad sin validar:** `checkAvailability` muestrea cada 30 min y el último minuto; una regla con bordes que no sean :00/:30 (p. ej. 07:15) da falsos positivos/negativos. No se soportan franjas que crucen medianoche. Validar en el formulario del propietario (Zod) o documentarlo en el tipo.
11. **`datetime.ts` asume que Argentina nunca tendrá horario de verano** ("1 hora = 3.600.000 ms siempre"). Correcto hoy y aceptable para la demo; en la etapa real, convertir con la base de zonas horarias.
12. **Montos:** `number` en JS está bien, pero al pasar a la base no usar `Int` de 32 bits (tope ≈ $ 21,4 millones); ver §3.8.
13. **El id visible de la reserva (`R-DEMO-1001`) cumple el rol de referencia.** En la etapa real separar `id` interno, `reference` visible y el código de reserva secreto.
14. **`Owner` está separado de un usuario**; `memberSince` es texto. En la etapa real: `User` con roles + `OwnerProfile`.
15. **No hay dirección exacta** en `Space` (correcto para la demo). En la etapa real hace falta, con acceso restringido.
16. Menor: en `searchSpaces`, si no hay rango válido la razón de no disponibilidad es `"fuera_de_horario"`, que no es lo que pasa; la UI debería tratar ese caso como "elegí fecha y horario" (ya lo hace `quote`).
17. Menor: `quote()` rechaza si la duración es menor al mínimo (otra opción sería cobrar el mínimo) y redondea hacia arriba (61 min = 2 h). Ambas son parte de la regla **pendiente de confirmación**; conviene que la UI lo explique.
