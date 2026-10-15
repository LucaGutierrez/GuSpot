import type { Metadata } from "next";
import { ContactEmail, LEGAL, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos pide GuSpot, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <section>
        <h2>1. Quién es responsable de tus datos</h2>
        <p>
          GuSpot (guspotapp.com) es un servicio de {LEGAL.owner}, responsable de la base de datos. Para cualquier
          consulta sobre tus datos escribinos a <ContactEmail />.
        </p>
        <p>
          Tratamos tus datos según la Ley 25.326 de Protección de los Datos Personales de la República Argentina y su
          reglamentación.
        </p>
      </section>

      <section>
        <h2>2. Qué datos pedimos y para qué</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> email y contraseña (o tu cuenta de Google o Apple, si entrás con ellas). Para que
            puedas ingresar. La contraseña se guarda cifrada: nadie de GuSpot puede verla.
          </li>
          <li>
            <strong>Datos personales:</strong> nombre, apellido, DNI, fecha de nacimiento y celular. Para saber quién
            usa el servicio, comprobar que sos mayor de edad y poder contactarte.
          </li>
          <li>
            <strong>Verificación de identidad:</strong> fotos de tu DNI y una prueba de vida con reconocimiento facial,
            que hace nuestro proveedor Didit, para comprobar que sos la persona del documento. Tu imagen y los datos de
            tu cara son datos especialmente protegidos: los usamos solo para esta verificación y con tu consentimiento,
            que das al iniciarla.
          </li>
          <li>
            <strong>Celular verificado</strong> (solo si te lo pedimos): te mandamos un código por SMS a través de Didit
            para confirmar que el número es tuyo.
          </li>
          <li>
            <strong>Si reservás o avisás que vas:</strong> licencia de conducir (número, categoría y vencimiento) y
            vehículos (marca, modelo, color, patente). Para que el garaje sepa quién llega y tenga los datos del vehículo por si pasa algo.
          </li>
          <li>
            <strong>Si publicás un garaje:</strong> los datos del establecimiento (ubicación, tarifas, horario, fotos,
            teléfono) y tu cuenta de Mercado Pago conectada para cobrar.
          </li>
          <li>
            <strong>Foto de perfil</strong> (opcional).
          </li>
          <li>
            <strong>Reservas, pagos y avisos de llegada:</strong> para prestar el servicio, resolver reclamos y cumplir
            obligaciones legales.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Si entrás con tu cuenta de Google</h2>
        <p>
          Si elegís &quot;Continuar con Google&quot;, Google nos comparte <strong>tu nombre, tu email y tu foto de
          perfil</strong> (los permisos básicos &quot;email&quot; y &quot;perfil&quot;). No pedimos acceso a tus
          contactos, tu Gmail, tu calendario ni a ningún otro dato de Google.
        </p>
        <ul>
          <li>Los usamos solo para crear tu cuenta de GuSpot, dejarte ingresar y mostrar tu nombre en la app.</li>
          <li>
            No los vendemos, no los usamos para publicidad y no los compartimos con nadie más allá de los proveedores
            de la sección 6, que nos ayudan a prestar el servicio.
          </li>
          <li>
            Podés quitarle el acceso a GuSpot cuando quieras desde tu cuenta de Google (myaccount.google.com → Seguridad
            → Conexiones con terceros) y pedirnos que borremos tus datos escribiendo a <ContactEmail />.
          </li>
        </ul>
        <p>
          El uso de los datos recibidos de las APIs de Google cumple con la Política de Datos del Usuario de los
          Servicios de API de Google, incluidos los requisitos de uso limitado.
        </p>
      </section>

      <section>
        <h2>4. Tu ubicación</h2>
        <p>
          Si nos das permiso, usamos la ubicación de tu teléfono para mostrarte los garajes cercanos. Se usa solo en tu
          dispositivo mientras tenés abierta la búsqueda: <strong>no la guardamos ni la enviamos a nuestros servidores</strong>.
        </p>
      </section>

      <section>
        <h2>5. Quién ve tus datos</h2>
        <ul>
          <li>
            <strong>Las fotos de tu DNI y tu selfie</strong> se guardan en un espacio privado: no las ve ningún otro
            usuario.
          </li>
          <li>
            <strong>El garaje donde reservás o al que avisás que vas</strong> ve tu nombre, tu foto de perfil y los datos
            de tu vehículo (marca, modelo, color y patente).
          </li>
          <li>
            <strong>Quien reserva en tu garaje</strong> ve la dirección y las indicaciones de llegada recién cuando la
            reserva está pagada o cuando avisa que va. Los datos públicos del garaje (nombre, zona, precio, horario,
            lugares libres y punto en el mapa) los ve cualquier persona.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Proveedores que procesan datos por nosotros</h2>
        <ul>
          <li>
            <strong>Supabase</strong> (base de datos, cuentas y archivos). Servidores en San Pablo, Brasil: tus datos se
            transfieren y guardan fuera de la Argentina.
          </li>
          <li>
            <strong>Didit</strong> (verificación de identidad y envío de SMS).
          </li>
          <li>
            <strong>Resend</strong> (envío de los emails de la cuenta, como confirmar tu email o recuperar la
            contraseña: recibe tu email y el contenido del mensaje).
          </li>
          <li>
            <strong>Mercado Pago</strong> (pagos). Los datos de tu tarjeta los ingresás en Mercado Pago: GuSpot no los
            ve ni los guarda.
          </li>
          <li>
            <strong>Google y Apple</strong>, solo si elegís entrar con ellos (ver la sección 3).
          </li>
          <li>
            <strong>Cloudflare</strong> (publicación del sitio), <strong>OpenFreeMap</strong> (mapa) y{" "}
            <strong>Georef de datos.gob.ar / Photon</strong> (búsqueda de direcciones: reciben el texto de la dirección
            que buscás).
          </li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </section>

      <section>
        <h2>7. Cuánto tiempo los guardamos</h2>
        <p>
          Mientras tengas tu cuenta y, después, el tiempo que exijan las obligaciones legales y contables (por ejemplo,
          los comprobantes de pago). Si eliminás tu cuenta, borramos tus fotos de documentos y tus datos personales,
          salvo lo que la ley nos obligue a conservar.
        </p>
      </section>

      <section>
        <h2>8. Tus derechos</h2>
        <p>
          Podés acceder, rectificar, actualizar o pedir que eliminemos tus datos. Muchos los podés cambiar vos mismo en{" "}
          <strong>Tu cuenta</strong>; para lo demás, o para eliminar tu cuenta, escribinos a <ContactEmail />. Si nos
          pediste borrarlos, puede que tengamos que conservar algunos por obligación legal.
        </p>
        <p>
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
          gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme
          lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.
        </p>
        <p>
          La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene
          la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos
          por incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>
      </section>

      <section>
        <h2>9. Seguridad</h2>
        <p>
          Usamos conexiones cifradas (HTTPS), reglas de acceso para que cada persona vea solo lo suyo y guardamos las
          claves de los servicios fuera del sitio. Ningún sistema es 100 % seguro: si detectamos un problema que afecte
          tus datos, te vamos a avisar.
        </p>
      </section>

      <section>
        <h2>10. Menores de edad</h2>
        <p>GuSpot es solo para mayores de 18 años.</p>
      </section>

      <section>
        <h2>11. Cambios</h2>
        <p>
          Si cambiamos esta política, actualizamos la fecha de arriba y, si el cambio es importante, te avisamos por la
          app o por email.
        </p>
      </section>
    </LegalPage>
  );
}
