# GuSpot

Encontrá dónde estacionar en CABA: garajes cerca tuyo con **lugares libres en vivo**, precio a la vista y la opción de **avisar que vas** o **reservar y pagar** desde el celular.

**Sitio:** https://guspot-demo.pages.dev (beta en CABA; se instala en el celular como app desde "Agregar a inicio").

## Qué hace

**Conductores**
- Mapa con los garajes cercanos, su precio por hora y si tienen lugar (lo informa cada garaje).
- **"Voy a este"**: avisa al garaje que llegás; muestra dirección e indicaciones. No reserva lugar.
- **Reservar y pagar** con Mercado Pago, desde ahora o para otro día. Devolución total si se cancela en los primeros 10 minutos.
- Navegación con Google Maps, Waze o Mapas de Apple.

**Garajes**
- Publicación con ubicación, tarifas, horario, capacidad y fotos.
- Panel en vivo: sumar/restar lugares, pausar la recepción y ver quién va en camino.
- Cobro directo en su cuenta de Mercado Pago (GuSpot cobra un cargo de servicio al conductor).

**Seguridad**
- Identidad verificada con DNI y reconocimiento facial (Didit); celular verificado por SMS para publicar.
- Conductores: licencia (con el mismo número que el DNI), vehículo y seguro vigente.

## Tecnología

- **Next.js 16** (App Router) exportado como sitio estático, **Tailwind CSS v4**, **TypeScript**.
- **Supabase**: Postgres con reglas de seguridad por fila, autenticación, archivos y tiempo real.
- **Supabase Edge Functions**: verificación con Didit y pagos con Mercado Pago (las claves secretas viven solo ahí).
- **MapLibre** + **OpenFreeMap** (mapa), **Georef** de datos.gob.ar (direcciones).
- Publicado en **Cloudflare Pages**.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar URL y clave publishable de Supabase
npm run dev                  # http://localhost:3000
npm run lint
npm run test:security        # pruebas de seguridad de la base (locales)
npm run build                # genera out/
npm run deploy               # build + publicación en Cloudflare Pages
```

## Estructura

```
src/app/            páginas (una carpeta por ruta)
src/components/     pantallas y componentes, agrupados por tema
src/lib/            lógica compartida: datos (Supabase), fechas, precios, mapa, búsqueda
supabase/migrations reglas y funciones de la base (en orden)
supabase/functions  funciones del servidor: didit, mercadopago
public/brand/       logo y archivos de marca
docs/               arquitectura, pagos, Supabase, mapas, marca y publicación
```

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Supabase](docs/supabase.md)
- [Pagos con Mercado Pago](docs/pagos.md)
- [Mapas](docs/mapas.md)
- [Publicación](docs/publicacion.md)
- [Marca](docs/marca.md)
- [Seguridad](docs/seguridad.md)
- [Registro de la marca](docs/registro-de-marca.md)
