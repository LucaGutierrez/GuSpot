import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LEGAL, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Las reglas para usar GuSpot como conductor o como garaje.",
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <section>
        <h2>1. Qué es GuSpot</h2>
        <p>
          GuSpot es una plataforma que conecta a personas que buscan dónde estacionar con garajes y estacionamientos.
          El servicio lo presta {LEGAL.owner} (en adelante, &quot;GuSpot&quot;). Contacto: <ContactEmail />.
        </p>
        <p>
          GuSpot no es dueño ni operador de los garajes: cada garaje es un comercio independiente, responsable de su
          servicio, de sus instalaciones y de la información que publica.
        </p>
      </section>

      <section>
        <h2>2. Tu cuenta</h2>
        <ul>
          <li>Tenés que ser mayor de 18 años y cargar tus datos reales, tal como figuran en tu DNI.</li>
          <li>
            Para reservar o avisar que vas tenés que verificar tu identidad (DNI y reconocimiento facial), cargar tu
            licencia de conducir vigente —con el mismo número que tu DNI— y al menos un vehículo con su seguro vigente.
          </li>
          <li>Para publicar un garaje tenés que verificar tu identidad y tu celular.</li>
          <li>La cuenta es personal: no la compartas. Sos responsable de lo que se haga con ella.</li>
        </ul>
      </section>

      <section>
        <h2>3. Disponibilidad y &quot;Voy a este&quot;</h2>
        <ul>
          <li>
            Los lugares libres los informa cada garaje. Mostramos cuándo se actualizaron, pero pueden cambiar: GuSpot no
            garantiza que haya lugar si no reservaste.
          </li>
          <li>
            <strong>&quot;Voy a este&quot; es solo un aviso</strong> para que el garaje sepa que llegás. No reserva un
            lugar ni genera ningún cobro. El precio y la forma de pago los pone el garaje.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Reservas y pagos</h2>
        <ul>
          <li>
            Al reservar ves, antes de pagar, la tarifa del garaje, la <strong>seña</strong> (hoy, 50 % de la tarifa) y lo
            que queda para pagar en el garaje. El conductor no paga cargos extra: en total paga la tarifa del garaje.
          </li>
          <li>
            La seña se paga con Mercado Pago. Mientras pagás te guardamos el lugar unos minutos; si no se completa el pago,
            el lugar se libera. La reserva queda confirmada cuando Mercado Pago aprueba el pago. El resto se le paga al
            garaje al llegar.
          </li>
          <li>
            La seña se acredita directamente en la cuenta de Mercado Pago del garaje, menos el{" "}
            <strong>cargo de servicio de GuSpot</strong> (hoy, 10 % de la tarifa total), que paga el garaje.
          </li>
          <li>
            <strong>Cancelación:</strong> podés cancelar con <strong>devolución total de la seña dentro de los 10 minutos</strong>{" "}
            posteriores al pago. Después podés cancelar para liberar el lugar, pero sin devolución. Una vez empezada la
            reserva no se puede cancelar desde la app.
          </li>
          <li>
            La devolución vuelve al mismo medio de pago y los plazos de acreditación dependen de Mercado Pago y de tu
            banco.
          </li>
          <li>
            [Derecho de revocación y &quot;botón de arrepentimiento&quot; (Ley 24.240 y Resolución 424/2020): a definir
            con asesoramiento legal.]
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Si publicás un garaje</h2>
        <ul>
          <li>
            Te comprometés a publicar información verdadera (ubicación, tarifas, horario, servicios) y a mantener
            actualizados los lugares libres.
          </li>
          <li>Tenés que respetar las reservas pagadas y el precio publicado al momento de reservar.</li>
          <li>
            Sos responsable de tu establecimiento, de la custodia de los vehículos y de cumplir las normas que te
            correspondan (habilitaciones, seguros, impuestos y facturación).
          </li>
          <li>Para cobrar reservas conectás tu propia cuenta de Mercado Pago.</li>
        </ul>
      </section>

      <section>
        <h2>6. Lo que no está permitido</h2>
        <ul>
          <li>Usar datos o documentos de otra persona, o crear cuentas falsas.</li>
          <li>Publicar garajes inexistentes, precios engañosos o contenido ofensivo.</li>
          <li>Acaparar lugares, molestar a otros usuarios o usar GuSpot para algo ilegal.</li>
          <li>Intentar acceder a datos ajenos, sobrecargar el servicio o vulnerar su seguridad.</li>
        </ul>
        <p>Podemos suspender o cerrar cuentas que incumplan estas reglas.</p>
      </section>

      <section>
        <h2>7. Responsabilidad</h2>
        <p>
          GuSpot hace lo posible para que el servicio funcione bien, pero puede tener interrupciones. Los daños, robos o
          problemas con el vehículo dentro de un garaje se resuelven con el garaje y su seguro. [Alcance de la
          responsabilidad de GuSpot: a definir con asesoramiento legal.]
        </p>
      </section>

      <section>
        <h2>8. Datos personales</h2>
        <p>
          Cómo usamos tus datos está explicado en la{" "}
          <Link href="/privacidad/" className="font-semibold text-brand-700 hover:underline">
            Política de privacidad
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>9. Cambios y ley aplicable</h2>
        <p>
          Podemos actualizar estos términos; si el cambio es importante te avisamos antes. Se aplican las leyes de la
          República Argentina. [Jurisdicción: a definir con asesoramiento legal.]
        </p>
      </section>
    </LegalPage>
  );
}
