# Publicar la demo

La demo es un **sitio estático**: `npm run build` genera la carpeta `out/` (HTML, CSS, JS). No necesita servidor, base de datos ni funciones, así que cualquier hosting estático gratuito sirve.

> **Mapa (qué cambia y qué no)**
> - El sitio ahora hace **solicitudes a un tercero desde el navegador del visitante**: el mapa pide estilo, tiles, fuentes e íconos a `tiles.openfreemap.org` (OpenFreeMap). Para la demo no hay clave ni configuración que cargar en el hosting. Ver [mapas.md](mapas.md).
> - El worker del mapa (`public/vendor/maplibre-gl-worker.mjs`) lo genera `npm run build` (script `prebuild`) y queda dentro de `out/`. Los comandos de build de abajo no cambian.
> - **"Mi ubicación" requiere HTTPS** (la geolocalización del navegador no funciona en HTTP, salvo `localhost`). Los subdominios `*.vercel.app` y `*.pages.dev` ya sirven por HTTPS.
> - **Variable opcional `NEXT_PUBLIC_MAP_STYLE_URL`** (no hace falta para la demo): URL de un estilo compatible con MapLibre para usar otro proveedor de mapas. Se carga en las variables de entorno **de build** del hosting (Vercel: Settings > Environment Variables; Cloudflare Pages: Settings > Variables) y requiere volver a hacer build. Si el proveedor usa clave, queda visible en el navegador: usar una clave restringida por dominio. Ver `.env.example` y [mapas.md](mapas.md) §4.1.
> - Nada más cambia en el deploy.

Fuentes: documentación oficial consultada el **9 de octubre de 2026**. Los planes y límites cambian; revisá los enlaces antes de publicar.

> **Reglas para no gastar plata**
> - No aceptes ningún **trial** (prueba de plan pago).
> - No cargues **tarjeta** ni otro medio de pago.
> - No compres **dominios**: usá el subdominio gratuito (`*.vercel.app` o `*.pages.dev`).
> - Si una pantalla pide medio de pago para seguir, **cancelá** y avisá.

---

## Estado actual (2026-10-09): publicada en Cloudflare Pages

- **URL:** https://guspot-demo.pages.dev — demo con datos de ejemplo, sin reservas persistentes ni pagos reales. Tiene `noindex` (no aparece en buscadores).
- **Proyecto:** `guspot-demo`, Cloudflare Pages, plan Free, carga directa con Wrangler (sin integración con Git). Rama de producción: `main`.
- Solo archivos estáticos (sin Pages Functions): según la documentación oficial, las solicitudes a archivos estáticos son gratuitas e ilimitadas.

### Actualizar la demo

```bash
npm run deploy:demo
```

Compila (`out/`) y sube a producción (`https://guspot-demo.pages.dev`). Cada deploy además tiene una URL propia (`https://<hash>.guspot-demo.pages.dev`) que sirve como versión fija para comparar.

Para una versión de prueba sin tocar producción:

```bash
npm run build
npx wrangler pages deploy out --project-name guspot-demo --branch prueba
```

(queda en `https://prueba.guspot-demo.pages.dev`).

Requisitos: sesión iniciada con `npx wrangler login` (la hace el dueño de la cuenta; las credenciales quedan en la computadora). Para cerrarla: `npx wrangler logout`.

### Notas del primer deploy

- Wrangler 4.149 intenta "delegar" los comandos de Pages a Cloudflare Workers. Para crear el proyecto en Pages se usó una única vez `wrangler pages project create guspot-demo --production-branch main --force`. Los deploys posteriores van directo a Pages y no necesitan `--force`.
- El primer intento de crear el proyecto devolvió un error 500 de la API; el reintento funcionó.
- El login se hizo con los permisos por defecto de Wrangler (amplios). Para limitarlos: `npx wrangler logout` y luego `npx wrangler login --scopes account:read user:read pages:write --use-keyring` (`offline_access` lo agrega Wrangler solo; `logout` invalida el token anterior).
- Wrangler envía métricas de uso anónimas; se pueden desactivar con `npx wrangler telemetry disable`.

## Antes de empezar: el repositorio

El proyecto tiene git local (rama `main`) pero **no tiene remoto en GitHub**. Para la opción "importar desde GitHub" hay que subirlo primero:

1. En github.com, con tu cuenta personal, creá un repositorio **vacío** (sin README ni .gitignore). Puede ser privado.
   En Vercel Hobby **no** se puede conectar un repositorio que pertenezca a una organización de GitHub; usá tu cuenta personal ([vercel.com/docs/limits](https://vercel.com/docs/limits)).
2. En la carpeta del proyecto:
   ```bash
   git remote add origin https://github.com/<TU_USUARIO>/<REPOSITORIO>.git
   git push -u origin main
   ```

Si no querés usar GitHub todavía, las dos opciones permiten publicar desde la terminal (CLI), sin repositorio remoto.

---

## Opción A: Vercel (plan Hobby)

### Qué dice la documentación oficial

**Es gratis.** "The Hobby plan is **free** and aimed at developers with personal projects, and small-scale applications." — [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby)

**Límites relevantes para un sitio estático** (por mes, misma fuente y [vercel.com/docs/limits](https://vercel.com/docs/limits)):

| Recurso | Hobby |
|---|---|
| Fast Data Transfer (tráfico) | primeros 100 GB |
| CDN Requests | primeros 1.000.000 |
| Deployments por día | 100 |
| Tiempo de build por deployment | 45 min |
| Subida por CLI (archivos fuente) | 100 MB; máx. 15.000 archivos |
| Proyectos | 200 |

Funciones, imágenes optimizadas, etc. no aplican: la demo no las usa (`images.unoptimized`, `output: "export"`).

**Qué pasa si se superan los límites.** "As the Hobby plan is a free tier there are no billing cycles. In most cases, if you exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed before you can use the feature again." — [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby). Es decir: **no cobra, pausa**.

**Uso comercial.** "**Hobby teams** are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan." Definición: "Commercial usage is defined as any Deployment that is used for the purpose of financial gain of **anyone** involved in **any part of the production** of the project, including a paid employee or consultant writing the code." Ejemplos que da: cualquier forma de pedir o procesar pagos de visitantes; publicitar la venta de un producto o servicio; cobrar por crear, actualizar o alojar el sitio; sitios cuyo fin principal son links de afiliados; incluir publicidad. Pedir donaciones no es uso comercial. "If you are unsure whether or not your site would be defined as commercial usage, please contact the Vercel Support team." — [vercel.com/docs/limits/fair-use-guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)

**Protección (sitio privado).** En Hobby está disponible **Vercel Authentication** para deployments de preview **y de producción**, más Deployment Protection Exceptions y Shareable Links. Password Protection **no** está en Hobby (es de Pro, con costo). — [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby), [vercel.com/docs/deployment-protection](https://vercel.com/docs/deployment-protection)
- Con alcance **All Deployments** se protegen todas las URLs, incluida la de producción (`*.vercel.app`). Disponible en todos los planes.
- Quién entra: miembros con acceso, usuarios de Vercel a los que les aprobaste un pedido de acceso, o quien tenga un Shareable Link. — [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- Límites en Hobby: "Those on the Hobby plan can only have one external user per account." y "Developers on the hobby plan can only create one shareable link in total per account." — [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Sharable Links](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links)

**Trial de Pro.** Se inicia al **crear un Team** y elegir la opción "Pro Trial". Dura 14 días o hasta superar el uso del trial. "Without a payment method, your account reverts to a Hobby plan when the trial ends." y "Charges apply only if you have a payment method." — [vercel.com/docs/plans/pro-plan/trials](https://vercel.com/docs/plans/pro-plan/trials)
**Cómo evitarlo:** no crees Teams, no toques "Upgrade" ni "Pro Trial", no agregues medio de pago en Settings > Billing.

### Lectura sobre "non-commercial personal use" para GuSpot

- **Lo que dice la fuente:** el uso comercial es cualquier deployment usado "for the purpose of financial gain" de cualquier persona involucrada; la lista de ejemplos es "not limited to"; ante la duda, consultar a Soporte.
- **Interpretación (no es asesoramiento legal):** una demo privada **sin pagos, sin publicidad y sin vender nada** no encaja en ninguno de los ejemplos listados. Pero la definición es amplia y GuSpot es un emprendimiento con fin de lucro: si la demo se usa para presentar el negocio a inversores, socios o propietarios, es razonable leerla como "para obtener un beneficio económico", o sea **zona gris** con riesgo de ser comercial. El lanzamiento público (con Mercado Pago) es **claramente comercial** y no puede ir en Hobby.
- **Para cerrar la duda:** consultar a Vercel Support (lo sugiere la propia documentación) o usar la opción B para la demo.

### Pasos (Vercel)

**Crear la cuenta**
1. Entrá a vercel.com y registrate con tu cuenta de GitHub (o email). Si pregunta el tipo de uso, elegí el de proyectos personales / Hobby.
2. No cargues tarjeta. No crees Teams. Ignorá ofertas de trial.

**Camino 1: importar desde GitHub** (requiere haber subido el repo, ver arriba)
1. Dashboard > **Add New… > Project** > elegí el repositorio.
2. Framework Preset: **Next.js** (lo detecta solo). Build Command: `npm run build` (default). Output Directory: dejalo por defecto con el preset Next.js. Si en algún momento elegís el preset "Other", poné Output Directory `out`.
3. **Deploy.** Cada `git push` a `main` vuelve a publicar.

**Camino 2: desde la terminal, sin GitHub**
```bash
npx vercel login
npx vercel          # primer deploy: pregunta y crea el proyecto; el primero va a producción
npx vercel --prod   # deploys siguientes a producción
```
Aceptá los valores detectados (Next.js, `npm run build`). — [vercel.com/docs/cli/deploy](https://vercel.com/docs/cli/deploy)
El CLI crea la carpeta `.vercel/` (ya está en `.gitignore`).

**Hacerla privada (opcional)**
Proyecto > **Settings > Deployment Protection** > activá **Vercel Authentication** > alcance **All Deployments** > **Save**.
Para compartirla con alguien sin cuenta: en el deployment, **Share > Anyone with the link** (un solo link en Hobby). Para revocar: **Only people with access**.

---

## Opción B: Cloudflare (plan Free)

### Pages o Workers

La portada de Pages hoy dice: "Workers supports most Pages use cases and offers a broader feature set. It is Cloudflare's primary platform for building applications. Start new projects with Workers." — [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages/)
Sin embargo, la guía de Next.js para Workers indica Pages para el caso "Your application is a static export and you specifically want to deploy it to Cloudflare Pages", y la guía de Pages para Next.js estático sigue vigente. — [Next.js en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Next.js estático en Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
**Recomendación para la demo:** Pages (menos configuración: no requiere archivo `wrangler.jsonc`). Workers static assets queda como alternativa (abajo).

### Límites del plan Free

Pages — [developers.cloudflare.com/pages/platform/limits](https://developers.cloudflare.com/pages/platform/limits/):
- 500 builds por mes; 1 build a la vez; timeout de build 20 min.
- Hasta 20.000 archivos por sitio; 25 MiB por archivo.
- 100 proyectos por cuenta; 100 dominios personalizados por proyecto.

Workers static assets — [pricing](https://developers.cloudflare.com/workers/platform/pricing/), [billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [limits](https://developers.cloudflare.com/workers/platform/limits/):
- "Requests to static assets are free and unlimited." / "There is no additional cost for storing Assets."
- 20.000 archivos por versión, 25 MiB por archivo. El límite de 100.000 requests/día aplica a invocaciones del Worker, no a archivos estáticos.
- Al superar un límite del plan Free, las operaciones fallan con error; no hay cobro.

### Uso comercial

- **No encontré una restricción explícita de uso comercial** para el plan Free en la documentación de Pages/Workers ni en el [Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/) (última actualización indicada: 12/09/2025).
- **Sí hay una restricción relevante para el futuro:** sección 2.2.1(h), entre lo que no se puede hacer salvo permiso escrito: "process or collect personal or business credit card information on any web property that is receiving Free Services". Para la demo no aplica (no hay pagos); para el lanzamiento, si los datos de tarjeta se ingresan en páginas propias (p. ej. Checkout Bricks), revisarlo antes de usar el plan Free.

### Protección (sitio privado)

Pages permite "Enable access policy" (Cloudflare Access) pero, según la documentación, "this will only protect your preview deployments … and not your `*.pages.dev` domain or custom domain"; para la URL de producción remite a [Known issues](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain). — [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
No verifiqué el costo de Cloudflare Access / Zero Trust. **Si el alta pide tarjeta, no avances.** Alternativa sin costo: no compartir la URL (no es protección real).

### Pasos (Cloudflare Pages)

**Crear la cuenta**
1. Registrate en dash.cloudflare.com con email. No cargues medio de pago, no agregues dominios, no compres nada.

**Camino 1: subida directa con Wrangler (sin GitHub)** — [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
```bash
npm run build                                  # genera out/
npx wrangler login
npx wrangler pages project create              # nombre, p. ej. guspot-demo; rama de producción: main
npx wrangler pages deploy out
```
Queda en `https://<proyecto>.pages.dev`. Para actualizar: `npm run build` y otra vez `npx wrangler pages deploy out`.
Ojo: "If you choose Direct Upload, you cannot switch to Git integration later." (habría que crear otro proyecto).

**Camino 2: conectar GitHub** (requiere el repo en GitHub)
1. Dashboard > **Workers & Pages** > crear > pestaña Pages > **Import an existing Git repository** > elegí el repo.
2. Framework preset: **Next.js (Static HTML Export)**. Build command: `npm run build` (la guía oficial muestra `npx next build`, equivalente). Build output directory: `out`.
3. **Save and Deploy**. Si el build falla por versión de Node (Next 16 requiere Node 20.9 o superior), agregá la variable de entorno de build `NODE_VERSION` con un valor soportado (p. ej. `22`) y reintentá.

**Alternativa: Workers static assets** — [Static assets](https://developers.cloudflare.com/workers/static-assets/)
Requiere un `wrangler.jsonc` en la raíz con `"assets": { "directory": "./out" }` (más `name` y `compatibility_date`) y `npx wrangler deploy`. Agregar ese archivo es un cambio de configuración: lo decide el coordinador.

---

## Comparación rápida

| | Vercel Hobby | Cloudflare Free (Pages) |
|---|---|---|
| Costo | $0 | $0 |
| Uso comercial | Prohibido ("non-commercial personal use only") | Sin restricción explícita encontrada; sí prohíbe recolectar datos de tarjeta en propiedades Free |
| Tráfico | 100 GB/mes | Workers: "Requests to static assets are free and unlimited". Pages: su página de límites no lista un tope de tráfico (no hallé afirmación explícita) |
| Sitio privado gratis | Sí, Vercel Authentication (1 usuario externo, 1 link compartible) | Solo previews con Access; producción requiere pasos extra, costo no verificado |
| Al superar límites | Pausa ~30 días, no cobra | Falla con error, no cobra |

## Para el lanzamiento público

La demo estática es lo único que entra en estas opciones gratuitas. El producto real (cuentas, base de datos, pagos con Mercado Pago, webhooks) necesita funciones de servidor y es **uso comercial**: requiere un plan pago o un hosting acorde, a decidir más adelante (ver `decisiones-pendientes.md`).
Lo mismo para el mapa: la instancia pública de OpenFreeMap no tiene SLA; para el lanzamiento hace falta un proveedor con condiciones comerciales y SLA, o self-hosting (ver [mapas.md](mapas.md) §7).
