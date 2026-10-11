# Pagos con Mercado Pago

Cómo funciona y qué hay que configurar. Decisiones del usuario (2026-10-11):

- La plata de cada reserva va **directo a la cuenta de Mercado Pago del garage**. GuSpot cobra su parte (cargo de servicio) en el mismo pago, sin manejar plata de terceros.
- El **cargo de servicio lo paga el conductor**: 10 % de la tarifa (se cambia en `app_settings.service_fee_percent`).
- **Cancelación**: devolución total hasta 10 minutos después de pagar (`refund_window_minutes`). Después se puede cancelar sin devolución.
- El lugar se guarda 15 minutos esperando el pago (`payment_hold_minutes`).

## 1. Crear la aplicación en Mercado Pago (lo hace el dueño de GuSpot)

1. Entrar a https://www.mercadopago.com.ar/developers/panel/app con la cuenta de Mercado Pago de GuSpot.
2. **Crear aplicación** → tipo de pago online, producto **Checkout Pro**, modelo de integración **Marketplace** (cobrar en nombre de otros vendedores).
3. En la aplicación, **URLs de redireccionamiento** (OAuth):
   - `https://guspot-demo.pages.dev/mis-garages/cobros/`
   - `http://localhost:3000/mis-garages/cobros/` (para probar en la compu)
4. Copiar de **Credenciales de producción**: *Client ID* (número de la app) y *Client Secret*.

## 2. Guardar los secretos en Supabase

Nunca se pegan en el código ni en la página. Desde una terminal en la carpeta del proyecto:

```
npx supabase secrets set --project-ref qdyncjxfigrsigzongqh MP_CLIENT_ID=<número> MP_CLIENT_SECRET=<clave> MP_TEST_MODE=true
```

Con `MP_TEST_MODE=true` las cuentas se conectan en modo prueba y los pagos no son reales.

## 3. Probar

Mercado Pago no permite mezclar cuentas reales y de prueba. Para probar se usan **cuentas de prueba** (panel de la app → *Cuentas de prueba*): una "vendedor" para el garage y una "comprador" para el conductor.

1. Con la cuenta de GuSpot del garage: *Mis garages → Cobro de reservas → Conectar Mercado Pago*, e ingresar con el usuario de prueba **vendedor**.
2. Con otra cuenta de GuSpot (conductor verificado): reservar ese garage → *Reservar y pagar* → pagar en Mercado Pago con el usuario de prueba **comprador** y una tarjeta de prueba (titular `APRO` = aprobado, `OTHE` = rechazado).
3. Al volver, la reserva tiene que quedar **Confirmada · Pago aprobado** y mostrar la dirección.
4. Cancelar dentro de los 10 minutos → devolución total.

## 4. Lanzamiento

- `MP_TEST_MODE=false` y que cada garage reconecte su cuenta real.
- Revisar con un contador la facturación del cargo de servicio y con un abogado términos y condiciones de cancelación.
