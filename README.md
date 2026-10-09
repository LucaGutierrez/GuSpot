# GuSpot

Plataforma para buscar y reservar cocheras ofrecidas por propietarios, en Argentina (precios en ARS, hora de Buenos Aires).
Los conductores buscan por ciudad y barrio, ven precio y disponibilidad y solicitan una reserva; el propietario la aprueba o la rechaza.

## Estado: demo

Esta es una **versión de demostración estática** con datos de ejemplo. Un banner fijo lo indica en todas las páginas.

**Pantallas (datos de ejemplo, todo se calcula en el navegador):**
- `/` Inicio con búsqueda por ciudad o barrio, fecha y horario.
- `/buscar/` Resultados con precio total del período, disponibilidad, tipo y características; filtros y orden.
- `/espacios/[id]/` Detalle con ilustraciones de muestra, horario, tarifas, condiciones y panel de reserva.
- `/espacios/[id]/solicitar/` Solicitud de reserva (no se envía: muestra un resultado de demostración).
- `/mis-reservas/` Reservas de ejemplo del conductor, con estado de reserva y de pago por separado.
- `/propietarios/` Panel: solicitudes (aceptar/rechazar solo en memoria), próximas reservas y espacios.
- `/propietarios/publicar/` Asistente de publicación en 7 pasos (no guarda).
- `/propietarios/espacios/[id]/` Gestión de un espacio y validación de código (no disponible en la demo).
- `/acerca-de-la-demo/` Qué funciona y qué es solo demostración.

Funciona de verdad: cálculo de precio (hora, tarifa diaria, mínimo de horas), verificación de horario semanal y de reservas confirmadas de ejemplo, filtros y navegación.

**No funciona todavía:**
- Cuentas, registro ni login.
- Reservas reales: nada se guarda ni se envía al propietario.
- **Pagos**: no hay Mercado Pago ni tarjetas. Ninguna reserva figura como pagada.
- Código de reserva real (en la demo se muestra enmascarado).
- Mapa, mensajes, carga de fotos (las "fotos" son ilustraciones), reseñas.
- Políticas (cancelación, verificación de propietarios, plazos): figuran como "a definir".

## Cómo correrlo

Requisitos: Node.js 20.9 o superior y npm.

```bash
npm install
npm run dev      # desarrollo en http://localhost:3000
npm run lint     # ESLint
npm run build    # genera el sitio estático en out/
```

La carpeta `out/` se puede subir a cualquier hosting estático. Ver [docs/publicacion.md](docs/publicacion.md).

## Estructura

```
src/app/          rutas (Next.js App Router, exportación estática)
src/components/   UI compartida (ui/) y header/footer
src/lib/          tipos, datos de ejemplo, precio, disponibilidad, búsqueda, fechas y formato
docs/             documentación
```

Detalle y qué es compartido vs. por sección: [docs/arquitectura.md](docs/arquitectura.md). Convenciones para trabajar en el código: [AGENTS.md](AGENTS.md).

## Documentación

- [Arquitectura](docs/arquitectura.md): demo actual, etapas, reemplazo de los datos de ejemplo, interfaz de pagos futura, requisitos de Mercado Pago.
- [Modelo de datos](docs/modelo-de-datos.md): revisión de los tipos, borrador de `schema.prisma`, máquinas de estado de reserva y pago.
- [Publicación](docs/publicacion.md): cómo publicar la demo gratis (Vercel Hobby o Cloudflare) y sus restricciones.
- [Decisiones pendientes](docs/decisiones-pendientes.md): lo que falta definir.
- [Trabajo con agentes](docs/trabajo-con-agentes.md): roles, reglas y plantilla de encargo.

## Checklist para el lanzamiento público

No se abre al público hasta completar todo:

**Producto y datos**
- [ ] Base de datos PostgreSQL en producción con migraciones (incluida la restricción anti-superposición de reservas).
- [ ] Cuentas reales (Auth.js con email y contraseña), roles conductor/propietario, recuperación de contraseña.
- [ ] Reservas reales con aprobación manual, historial de estados y tareas de expiración/finalización.
- [ ] Código de reserva cifrado, con ventana horaria y auditoría, visible solo para conductor y propietario.
- [ ] Dirección exacta visible solo tras confirmar.
- [ ] Datos de ejemplo eliminados.

**Pagos**
- [ ] Mercado Pago integrado (tarjetas incluidas), probado con credenciales y usuarios de prueba.
- [ ] Webhooks HTTPS con validación de firma e idempotencia; reembolsos.
- [ ] Credenciales de producción cargadas como variables de entorno por el usuario.
- [ ] Momento del cobro, comisiones y distribución al propietario definidos.
- [ ] Sin almacenamiento de datos de tarjeta.

**Políticas**
- [ ] Regla de precio confirmada.
- [ ] Política de cancelación.
- [ ] Verificación de propietarios y documentación requerida.
- [ ] Plazo de respuesta del propietario.

**Legal y fiscal**
- [ ] Términos y condiciones.
- [ ] Política de privacidad conforme a la Ley 25.326.
- [ ] Facturación (ARCA) resuelta.

**Infraestructura**
- [ ] Hosting apto para uso comercial y con funciones de servidor (no Vercel Hobby).
- [ ] Copias de seguridad de la base, monitoreo de errores.

**Interfaz**
- [ ] Quitar el banner de demo (`DemoBanner`) y los avisos `DemoNotice`/`DemoBadge`.
- [ ] Revisar textos "a definir".
