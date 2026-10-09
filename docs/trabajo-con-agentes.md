# Trabajo con agentes

GuSpot se construye con un **coordinador** y varios **agentes** que trabajan en paralelo. Este documento fija los roles y las reglas.

## Roles

**Coordinador**
- Responsable de la arquitectura y de los archivos compartidos (`src/lib/**`, `src/components/ui/**`, `src/components/site-*.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, configuración).
- Reparte el trabajo: asigna a cada agente carpetas **exclusivas**.
- Integra: revisa lo entregado, aplica cambios a lo compartido, corre `npm run build` y prueba la navegación.
- Hace los commits.
- Lleva al usuario las decisiones de producto; no las toma por su cuenta.

**Agentes**
- Trabajan solo en las carpetas o archivos asignados.
- Si necesitan algo compartido (un tipo nuevo, un componente de UI, un dato de ejemplo), lo **piden** en su informe final, con la propuesta concreta; no lo editan.

**Usuario**
- Decide producto, políticas, aspectos legales, cuentas y credenciales (hosting, GitHub, Mercado Pago).

## Reglas

1. **No editar archivos compartidos** ni carpetas de otro agente. Leer sí.
2. **No decidir producto.** Lo no definido se muestra como "a definir" (ver `decisiones-pendientes.md`). No inventar políticas, precios reales, servicios ni credenciales.
3. **Respetar `AGENTS.md`**: reglas de la demo (datos de ejemplo visibles como tales, pago siempre `no_disponible`, código de reserva enmascarado, sin dirección exacta), restricciones de exportación estática, español rioplatense.
4. **Next.js 16 tiene cambios**: consultar `node_modules/next/dist/docs/` antes de usar una API.
5. **Verificación antes de entregar** (sobre los propios archivos):
   ```bash
   npx tsc --noEmit
   npx eslint <carpetas asignadas>
   ```
   El `npm run build` completo lo corre el **coordinador** al integrar (evita builds concurrentes pisando `.next/` y `out/`).
6. **Sin commits** de agentes. Sin instalar dependencias sin autorización del coordinador.
7. **Informe final breve**: archivos creados/modificados, cómo se verificó, pedidos sobre archivos compartidos, dudas de producto detectadas.

## Plantilla de encargo

```
Sos el agente de <SECCIÓN> del proyecto GuSpot en <RUTA DEL PROYECTO>.
Un coordinador integra el trabajo; otros agentes trabajan en paralelo.

PRIMERO leé: AGENTS.md, src/lib/*.ts, src/components/ui/*.tsx<, otros>.

ARCHIVOS QUE PODÉS CREAR/EDITAR (exclusivamente):
- <src/app/<ruta>/**>
- <otros>
Todo lo demás es solo lectura. No hagas commits ni instales dependencias.

OBJETIVO:
<qué pantalla/funcionalidad, para qué usuario, qué debe poder hacer en la demo>

CONTEXTO DE PRODUCTO (decidido):
<lo relevante de lo ya decidido>
PENDIENTE (no inventar, mostrar "a definir"):
<lista>

CRITERIOS DE ACEPTACIÓN:
- <comportamiento verificable 1>
- <comportamiento verificable 2>
- Mobile-first; datos de ejemplo marcados; pago "no disponible".

VERIFICACIÓN: npx tsc --noEmit y npx eslint <carpetas>. No corras npm run build.

INFORME FINAL (breve): archivos, verificación, pedidos sobre archivos
compartidos (con el cambio propuesto), dudas de producto.
```
