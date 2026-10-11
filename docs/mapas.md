# Mapas

Fuentes: páginas oficiales consultadas el **9 de octubre de 2026**. Precios, planes y condiciones cambian: revisá los enlaces antes de decidir.
Convención: **"Fuente:"** es lo que dice la página (citado o resumido); **"Interpretación:"** es lectura nuestra, no asesoramiento legal.

## 1. Decisión actual (demo)

| Pieza | Elección | Licencia / costo |
|---|---|---|
| Biblioteca de mapa | MapLibre GL JS v6 (npm `maplibre-gl`, hoy `^6.13.0`) | BSD-3-Clause (código abierto, uso comercial permitido) |
| Mapas base (tiles vectoriales + estilo) | Instancia pública de **OpenFreeMap**, estilo *liberty* (antes *positron*): `https://tiles.openfreemap.org/styles/liberty` | Gratis, sin clave ni registro |
| Datos del mapa | OpenStreetMap (vía OpenMapTiles) | ODbL, requiere atribución |
| Búsqueda | Por ciudad/barrio sobre el catálogo propio (`src/lib/search.ts`) | Sin geocodificación |

Por qué: permite mostrar el mapa en la demo **sin crear cuentas, sin claves y sin tarjeta**, con una biblioteca abierta que sirve igual con cualquier proveedor de tiles vectoriales.

**Decidido (usuario, 2026-10-09):** OpenFreeMap para la demo. Según su documentación: uso comercial permitido, sin límite de vistas, **sin SLA**. Limitación anotada: si OpenFreeMap se cae o se discontinúa, la demo se queda sin mapa (la lista y la búsqueda siguen andando). Para producción hace falta otro proveedor (§7, pendiente). Cambiar de proveedor: §4.1.

Pantallas (decidido 2026-10-09): **la búsqueda en el mapa es la pantalla principal** en celular y escritorio, en `/`.
- **Celular:** mapa a pantalla completa, con marcadores de precio y una tarjeta inferior al tocar uno.
- **Escritorio:** lista + mapa, ocupando exactamente el alto bajo el banner y el encabezado (variable CSS `--app-top`, ver §4).
- `/buscar/` es un alias que redirige a `/` conservando la búsqueda. El contenido del antiguo inicio está en `/como-funciona/`.
- **Zona inicial:** la última zona buscada (guardada en el navegador de la persona, ver §5) o **CABA** si no buscó ninguna.

## 2. OpenFreeMap: qué es gratis y por qué es SOLO para la demo

**Fuente** ([openfreemap.org](https://openfreemap.org/), [quick start](https://openfreemap.org/quick_start/), [términos](https://openfreemap.org/tos/), [privacidad](https://openfreemap.org/privacy/)):
- "OpenFreeMap lets you display custom maps on your website and apps for free."
- "There are no limits on the number of map views or requests."
- Uso comercial: la FAQ responde "Yes".
- "There's no registration, no user database, no API keys, and no cookies."
- Atribución obligatoria: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (la parte "OpenFreeMap" es opcional).
- "At the moment, I don't offer SLA guarantees or personalized support."
- Financiamiento: "We aim to cover the running costs of our public instance through donations" (GitHub Sponsors).
- Se puede usar la instancia pública o hacer **self-hosting** (código abierto; publican imágenes del planeta procesado).
- Términos: el sitio se ofrece "AS-IS, AS AVAILABLE"; sin garantías de disponibilidad; el servicio puede discontinuarse en cualquier momento sin aviso; sin responsabilidad por daños.
- Privacidad: no guardan IPs en los logs de acceso salvo incidentes de seguridad (máx. 30 días); logs borrados a los 7 días; sin cookies; pueden usar Cloudflare como CDN.

**Interpretación:**
- Para la demo es ideal: $0, sin cuenta, sin límites declarados.
- **No es adecuado tal cual para el lanzamiento comercial.** Aunque el uso comercial está permitido, no hay SLA ni soporte, depende de donaciones a un proyecto comunitario y puede discontinuarse sin aviso. Si el mapa es la pantalla principal en celular, una caída de OpenFreeMap deja la app sin su pantalla principal y no hay a quién reclamar.
- Para producción: proveedor con condiciones comerciales y SLA, o self-hosting (OpenFreeMap o Protomaps). Ver §7.

### Por qué no usamos `tile.openstreetmap.org` directamente

**Fuente** ([Tile Usage Policy, OSMF](https://operations.osmfoundation.org/policies/tiles/)): el servicio funciona "best-effort" sin SLA ni garantías; la OSMF puede "block access, without notice, if your usage degrades the service" y advierte a operadores comerciales que "access may be withdrawn at any point"; exige User-Agent identificable y Referer válido; prohíbe descarga masiva, precarga y archivado de tiles; sugiere usar proveedores alternativos derivados de OSM o self-hosting.
**Interpretación:** son servidores de la comunidad pensados para editores y uso liviano; además son tiles raster, no vectoriales. No corresponde apoyar un producto en ellos.

## 3. Atribución (obligatoria)

**Fuente** ([openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)): los datos de OSM están bajo la **ODbL**; hay que dar crédito a "OpenStreetMap and its contributors", dejar claro que los datos están bajo la Open Database License y enlazar a la página de copyright; en mapas navegables el ejemplo muestra el crédito en una esquina del mapa. Si se alteran o se construye sobre los datos y se distribuye el resultado, debe ser bajo la misma licencia (*share-alike*).
OpenFreeMap pide además "© OpenMapTiles".

En la demo: el control de atribución de MapLibre (que toma el texto del estilo) debe quedar **visible** sobre el mapa, sin taparlo con la barra de búsqueda, la tarjeta inferior ni la barra de navegación móvil. Texto esperado: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap", con enlace a [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright). Si se cambia de proveedor, cambia el texto: usar el que pida ese proveedor.

**Interpretación:** mostrar marcadores propios sobre el mapa no convierte nuestros datos de cocheras en "derivados" de OSM; pero si en el futuro se mezclaran datos de OSM con datos propios en una base, revisar el *share-alike* de la ODbL.

## 4. Cómo funciona técnicamente

- **Carga solo en el cliente.** El mapa usa APIs del navegador (WebGL, workers): el componente se carga del lado del cliente; en el HTML estático pre-generado no hay mapa. Se muestra un estado de carga y un mensaje si falla (sin conexión, WebGL no disponible, tiles caídos); la lista y la búsqueda siguen funcionando sin mapa.
- **Worker.** MapLibre procesa los tiles en un web worker. Como el bundler no lo empaqueta solo, `scripts/copy-map-worker.mjs` copia `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` a `public/vendor/` antes de `npm run dev` y `npm run build` (scripts `predev`/`prebuild` de `package.json`). Así el sitio estático sirve el worker desde su propio dominio. Si se agrega `public/vendor/` al `.gitignore`, el build lo regenera igual.
- **Conexión.** El estilo, los tiles, las fuentes de etiquetas y los íconos se piden al proveedor (en la demo, `tiles.openfreemap.org`) desde el navegador del visitante. Sin conexión a ese dominio, el mapa no se dibuja.
- **Contrato.** `src/components/map/types.ts` (`MapViewProps`, `MapMarker`) define la interfaz entre el componente de mapa (`src/components/map/`) y las pantallas que lo usan (`src/components/explore/`). Lo mantiene el coordinador. Resumen: marcadores con `label` (precio) y `ariaLabel`; selección con `selectedId`/`onSelect`; `fitKey` para reencuadrar; `fallbackCenter`; `userLocation` opcional; `padding` para que nada quede tapado.
- **Coordenadas.** `Space.coords` (`src/lib/types.ts`, WGS84) es el **punto público** (§6). Utilidades en `src/lib/geo.ts`: centro por defecto (Obelisco), zona inicial (`DEFAULT_MAP_ZONE = "CABA"`), distancia aproximada (Haversine) y su formato ("≈ 450 m"), `approximatePoint`.
- **Alto en escritorio.** `src/components/chrome-height.tsx` (`ChromeHeight`, montado en el layout) mide el banner de demo y el encabezado (elementos con `data-app-chrome`) y publica la suma en la variable CSS `--app-top`; la vista lista + mapa usa `calc(100dvh - var(--app-top))` o equivalente para no quedar cortada. En móvil, la barra inferior expone su alto en `--mobile-nav-height`.

### 4.1 Cambiar de proveedor

El proveedor está en **un solo archivo**: `src/components/map/config.ts` (`MAP_STYLE_URL` y `MAP_ORIGIN`). Las pantallas no lo conocen.

Opción A, sin tocar código (proveedor compatible con MapLibre):
1. Conseguir la URL de un **estilo compatible con MapLibre** (JSON de estilo, versión 8) del proveedor elegido o de tus propios tiles (p. ej. PMTiles).
2. Definirla como variable de **build** `NEXT_PUBLIC_MAP_STYLE_URL` (en `.env.local` para desarrollo, o en las variables de entorno del hosting). Ver `.env.example`.
3. Volver a correr `npm run build` y publicar: la variable se incrusta en el JS en el momento del build (cambiarla en el hosting sin rebuild no tiene efecto).
4. Verificar que la **atribución** que muestra el mapa sea la que pide el nuevo proveedor (§3); viene del estilo.
5. El preconnect del layout toma el origen de esa URL automáticamente (`MAP_ORIGIN`).

Opción B: cambiar el valor por defecto (`DEFAULT_STYLE_URL`) en `config.ts`.

**Claves:** si el proveedor usa clave, va dentro de esa URL y **queda visible en el navegador** de cualquier visitante. Usar solo una clave pública **restringida por dominio** en el panel del proveedor; nunca una clave secreta.

Proveedores que no usan MapLibre (Google Maps): hay que reescribir `src/components/map/` manteniendo el contrato `types.ts` (§7, notas).

### 4.2 Rendimiento

- **Medición (2026-10-09):** con la pestaña visible, el mapa queda listo en **~0,8 s**. La lentitud observada antes se debía a que Chrome frena el dibujo en pestañas no visibles durante las pruebas automatizadas, no a la app.
- Mejoras aplicadas: **preconnect** al origen del proveedor desde `src/app/layout.tsx` (`preconnect(MAP_ORIGIN)`), y la descarga de `maplibre-gl` **empieza al cargar el módulo del mapa** (`map-view.tsx`), no al montar el componente.

## 5. Privacidad: ubicación del conductor

- **Nunca se pide automáticamente** (decidido 2026-10-09). Solo al tocar el botón para usar la ubicación del dispositivo (permiso explícito del navegador).
- **Zona inicial sin ubicación:** la última zona buscada, guardada en el `localStorage` del navegador de la persona (`src/lib/last-zone.ts`, clave `guspot:ultima-zona`, máx. 80 caracteres) solo como comodidad; si no hay o el almacenamiento está bloqueado, CABA. Es texto de la zona buscada, no coordenadas, y no sale del navegador.
- Los datos de la Ciudad usan "CABA"; la búsqueda acepta "Buenos Aires" y "Capital Federal" como sinónimos.
- Se usa únicamente en el navegador para centrar el mapa y calcular distancias aproximadas. **No se guarda ni se envía** a ningún servidor (la demo no tiene servidor). Al recargar la página se pierde.
- Si el conductor rechaza el permiso o falla, la app sigue funcionando con búsqueda por ciudad/barrio.
- La geolocalización del navegador solo funciona en **HTTPS** (o `localhost`).
- Las solicitudes de tiles las hace el navegador del visitante a OpenFreeMap (un tercero); la zona del mapa que se mira se puede inferir de los tiles pedidos. Ver la [política de privacidad de OpenFreeMap](https://openfreemap.org/privacy/).
- **Para producción (a revisar con asesoramiento profesional):** si la ubicación llegara a guardarse o enviarse al servidor (p. ej. "cocheras cerca mío" calculado en el backend), es un dato personal en los términos de la **Ley 25.326**: definir finalidad, consentimiento, plazo de conservación y mencionarlo en la política de privacidad, junto con la mención del proveedor de mapas como tercero.

## 6. Ubicación pública de las cocheras (decidido 2026-10-09)

- **Punto público aproximado:** se desplaza el punto exacto entre **100 y 200 m**, en una dirección y distancia que dependen solo de un hash del id del espacio (`approximatePoint` en `src/lib/geo.ts`, FNV-1a). Es **estable**: siempre el mismo punto, así que no se puede promediar para encontrar el real. Las distancias calculadas con él se muestran como aproximadas ("≈").
- **Dirección exacta:** se muestra al conductor recién cuando la reserva está **confirmada y pagada**. En la demo (sin pagos) queda oculta siempre; se usa `approxLocation` (texto) y el punto aproximado.
- **Producción:** el desplazamiento se calcula **en el servidor** y la coordenada exacta **nunca se envía al navegador** antes de ese momento.
- **Demo:** los puntos "exactos" son **ficticios** y están en el código (`src/lib/demo-data.ts`, que expone `coords: approximatePoint(space.id, exactCoords)`); no corresponden a cocheras ni direcciones reales. Al ser un sitio estático, no hay forma de ocultarlos del navegador: por eso son inventados.

## 7. Opciones para producción (solo descripción, nada elegido)

Ninguna cuenta creada. Datos de las páginas oficiales al 09/10/2026; "no encontrado" significa que no lo vi en la página consultada.

| Opción | Clave / registro | Tarjeta | Plan gratuito | ¿Comercial en el plan gratuito? | Modelo de cobro | SLA |
|---|---|---|---|---|---|---|
| **OpenFreeMap (instancia pública)** | No | No | Todo es gratis; "no limits on the number of map views or requests" | Sí | Donaciones | No ("don't offer SLA guarantees") |
| **OpenFreeMap self-hosted** | No (servidor propio) | Costo del servidor propio | Software abierto | Sí | Infraestructura propia | El que dé nuestra infraestructura |
| **MapTiler Cloud** | Sí (cuenta y clave) | Free: "No credit card needed" | Free: 5.000 sesiones de mapa/mes, 100.000 requests/mes | **No**: "testing, PoC, prototyping, personal, or non-commercial use" | Flex: USD 30/mes con 25.000 sesiones y 500.000 requests, excedente USD 2,50 / 1.000 sesiones y USD 0,15 / 1.000 requests; Custom: contrato prepago | Solo plan Custom: "99.9% SLA" |
| **Stadia Maps** | Sí (cuenta) | Free y trial de 14 días de Professional sin tarjeta | Free: 200.000 créditos/mes, sin uso adicional | **No**: "Commercial use not allowed" | Starter USD 20/mes (1 M créditos, +3 ¢/1.000), Standard USD 80 (7,5 M, +2 ¢/1.000), Professional USD 250 (25 M, +1,5 ¢/1.000) | Enterprise: SLA a medida |
| **Protomaps (self-hosting con PMTiles)** | No | Costo del almacenamiento/CDN propio | Mapa base del planeta descargable gratis; un solo archivo PMTiles servido desde almacenamiento estático (p. ej. S3) por HTTP Range Requests | Sí (software BSD, datos ODbL con atribución) | Almacenamiento + tráfico del CDN elegido | El del CDN elegido |
| **Protomaps API alojada** | Sí (clave) | No encontrado | "Noncommercial use is free" | **No**: "for commercial use, become a GitHub Sponsor" | Patrocinio en GitHub; montos/límites no encontrados | No encontrado |
| **Google Maps Platform** | Sí (clave) | Requiere cuenta de facturación | Llamadas gratis por SKU por mes según plan (Essentials 10.000, Pro 5.000, Enterprise 1.000); crédito de prueba USD 300 para clientes nuevos | Sí, bajo sus términos | Por uso: Dynamic Maps (Essentials) 10.000 eventos gratis/mes, luego USD 7,00 / 1.000 en el primer tramo | No encontrado en la página de precios; no verifiqué los términos de SLA |

Fuentes: [OpenFreeMap](https://openfreemap.org/) · [MapTiler Cloud pricing](https://www.maptiler.com/cloud/pricing/) · [Stadia Maps pricing](https://stadiamaps.com/pricing/) · [Protomaps docs](https://docs.protomaps.com/) · [protomaps.com](https://protomaps.com/) · [Google Maps Platform pricing](https://mapsplatform.google.com/pricing/) · [Google, lista de precios](https://developers.google.com/maps/billing-and-pricing/pricing).

Notas:
- MapTiler, Stadia y Protomaps API **no permiten uso comercial en su plan gratuito**: para el lanzamiento implican plan pago.
- **Google Maps** no usa MapLibre: cambiar a Google implica reescribir el componente de mapa (el contrato `types.ts` ayuda a que las pantallas no cambien). Sus términos tienen restricciones sobre usar su contenido junto con mapas que no son de Google; **no pude leer el texto completo** de los [términos](https://cloud.google.com/maps-platform/terms): revisar antes de decidir.
- Self-hosting (OpenFreeMap o Protomaps) evita depender de un tercero para el mapa base, pero suma costo y mantenimiento propios (actualizar datos, CDN, monitoreo). Atribución ODbL igual obligatoria.
- Todas las opciones basadas en OSM requieren la atribución de §3.

## 8. Pendiente: búsqueda por dirección / geocodificación

Hoy se busca solo por ciudad y barrio del catálogo propio. Buscar por dirección ("Av. Corrientes 1234") o autocompletar requiere un **servicio de geocodificación** (otro proveedor, con sus propias condiciones, límites y costo; varios de los de la tabla lo ofrecen). No usar el geocodificador público de OSM (Nominatim) para un producto sin revisar su política de uso. Sigue pendiente: ver `decisiones-pendientes.md`.
