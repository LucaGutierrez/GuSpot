// Pruebas de seguridad de la base (reglas por fila, permisos y funciones).
// Cada prueba intenta un abuso concreto y verifica que la base lo rechace.
// Correr con: npm run test:security
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { DRIVER, OTHER, OWNER, asAdmin, asUser, createDb, seed, tomorrowAt } from "./db-helpers.mjs";

let db;
let garage;
let cars;

before(async () => {
  db = await createDb();
  ({ garage, cars } = await seed(db));
});

/** Espera que la consulta falle; si se pasa `match`, el mensaje tiene que contenerlo. */
async function rejects(promise, match) {
  await assert.rejects(promise, (err) => (match ? String(err.message).includes(match) : true));
}

describe("anónimo (sin sesión)", () => {
  for (const table of ["profiles", "vehicles", "bookings", "arrival_notices", "garage_private", "mp_accounts",
    "identity_checks", "function_errors", "app_settings"]) {
    test(`no puede leer ${table}`, () => rejects(asUser(db, null, `select * from ${table}`), "permission denied"));
  }

  test("solo ve garajes publicados", async () => {
    await asUser(db, OWNER, `insert into garages (title, city, neighborhood, approx_location, type, max_vehicle,
      hourly_price, min_hours, availability) values ('Borrador secreto', 'CABA', 'X', 'X', 'cubierta', 'moto', 1000, 1, '[]')`);
    const rows = await asUser(db, null, `select title from garages`);
    assert.deepEqual(rows.map((r) => r.title), ["Garaje Centro"]);
  });

  for (const fn of [
    `create_booking('${"0".repeat(8)}-0000-0000-0000-000000000000', now()::timestamp, now()::timestamp, '${"0".repeat(8)}-0000-0000-0000-000000000000')`,
    `missing_requirements('${OWNER}', 'conductor')`,
    `setting_int('x', 1)`,
  ]) {
    test(`no puede llamar ${fn.split("(")[0]}`, () => rejects(asUser(db, null, `select ${fn}`), "permission denied"));
  }
});

describe("usuario con sesión contra datos ajenos (IDOR / escalada)", () => {
  test("no ve el perfil de otra persona", async () => {
    const rows = await asUser(db, DRIVER, `select id from profiles`);
    assert.deepEqual(rows.map((r) => r.id), [DRIVER]);
  });

  test("no ve los vehículos de otra persona", async () => {
    const rows = await asUser(db, DRIVER, `select id from vehicles`);
    assert.deepEqual(rows.map((r) => r.id), [cars[DRIVER]]);
  });

  test("no ve la dirección privada de un garaje ajeno", async () => {
    assert.equal((await asUser(db, DRIVER, `select * from garage_private`)).length, 0);
  });

  test("no puede editar un garaje ajeno", async () => {
    const rows = await asUser(db, DRIVER, `update garages set hourly_price = 1 where id = $1 returning id`, [garage]);
    assert.equal(rows.length, 0);
  });

  test("no puede adueñarse de un garaje (owner_id)", () =>
    rejects(asUser(db, OWNER, `update garages set owner_id = $1 where id = $2`, [DRIVER, garage]), "permission denied"));

  test("no puede marcarse cobro online (online_payments)", () =>
    rejects(asUser(db, DRIVER, `update garages set online_payments = true`), "permission denied"));

  test("no puede marcarse identidad verificada", () =>
    rejects(asUser(db, DRIVER, `update profiles set identity_status = 'verificada'`), "permission denied"));

  test("no puede marcarse el celular verificado", () =>
    rejects(asUser(db, DRIVER, `update profiles set phone_verified = true`), "permission denied"));

  test("no puede crear ni modificar reservas directamente", async () => {
    await rejects(asUser(db, DRIVER, `insert into bookings (garage_id, driver_id) values ($1, $2)`, [garage, DRIVER]), "permission denied");
    await rejects(asUser(db, DRIVER, `update bookings set payment_status = 'aprobado'`), "permission denied");
  });

  test("no puede escribir cuentas de Mercado Pago ni la configuración", async () => {
    await rejects(asUser(db, DRIVER, `insert into mp_accounts (owner_id, mp_user_id, access_token) values ($1, 2, 'x')`, [DRIVER]), "permission denied");
    await rejects(asUser(db, DRIVER, `update app_settings set value = 'false'`), "permission denied");
  });

  test("no puede reservar con el vehículo de otra persona", () =>
    rejects(asUser(db, DRIVER, `select create_booking($1, ${tomorrowAt(10)}, ${tomorrowAt(11)}, $2)`, [garage, cars[OTHER]]), "vehicle_not_found"));

  test("el dueño no puede reservar su propio garaje", async () => {
    const [{ id: car }] = await asUser(db, OWNER, `insert into vehicles (brand, model, plate, size, insurer, insurance_policy, insurance_expiry)
      values ('VW', 'Gol', 'AD111AA', 'auto_chico', 'X', '1', '2035-01-01') returning id`);
    await asAdmin(db, `insert into storage.objects (bucket_id, name) values ('identity-docs', $1), ('identity-docs', $2)`,
      [`${OWNER}/licencia-frente`, `${OWNER}/licencia-dorso`]);
    await rejects(asUser(db, OWNER, `select create_booking($1, ${tomorrowAt(10)}, ${tomorrowAt(11)}, $2)`, [garage, car]), "own_garage");
  });

  test("no ve ni cancela la reserva de otra persona", async () => {
    const [{ create_booking: id }] = await asUser(db, OTHER, `select create_booking($1, ${tomorrowAt(14)}, ${tomorrowAt(15)}, $2)`, [garage, cars[OTHER]]);
    assert.equal((await asUser(db, DRIVER, `select id from bookings where id = $1`, [id])).length, 0);
    await rejects(asUser(db, DRIVER, `select cancel_booking($1)`, [id]), "not_found");
    assert.equal((await asUser(db, DRIVER, `select * from booking_access($1)`, [id])).length, 0);
  });

  test("no ve la dirección de una reserva sin pagar", async () => {
    const [{ create_booking: id }] = await asUser(db, DRIVER, `select create_booking($1, ${tomorrowAt(16)}, ${tomorrowAt(17)}, $2)`, [garage, cars[DRIVER]]);
    assert.equal((await asUser(db, DRIVER, `select * from booking_access($1)`, [id])).length, 0);
  });

  test("el conductor no puede marcar su aviso como 'llegó' (solo el garaje)", async () => {
    const [{ notify_arrival: id }] = await asUser(db, DRIVER, `select notify_arrival($1, 10, $2)`, [garage, cars[DRIVER]]);
    await rejects(asUser(db, DRIVER, `select update_arrival($1, 'llego')`, [id]), "forbidden");
    await rejects(asUser(db, OTHER, `select update_arrival($1, 'cancelado')`, [id]), "forbidden");
    assert.equal((await asUser(db, OTHER, `select * from arrival_access($1)`, [id])).length, 0);
    await asUser(db, OWNER, `select update_arrival($1, 'recibido')`, [id]);
  });

  test("foto de perfil: no puede apuntar a la carpeta de otra persona", () =>
    rejects(asUser(db, DRIVER, `update profiles set avatar_path = $1`, [`${OTHER}/11111111-2222-3333-4444-555555555555.jpg`]), "avatar_path_invalid"));

  test("fotos de garaje: la ruta tiene que estar en la carpeta del garaje", () =>
    rejects(asUser(db, OWNER, `insert into garage_photos (garage_id, path, position) values ($1, 'otra-carpeta/x.jpg', 0)`, [garage])));
});

describe("archivos (storage)", () => {
  test("no puede subir documentos a la carpeta de otra persona", () =>
    rejects(asUser(db, DRIVER, `insert into storage.objects (bucket_id, name) values ('identity-docs', $1)`, [`${OTHER}/selfie`])));

  test("no puede ver los documentos de otra persona", async () => {
    const rows = await asUser(db, DRIVER, `select name from storage.objects where bucket_id = 'identity-docs'`);
    assert.ok(rows.every((r) => r.name.startsWith(DRIVER)), "ve documentos ajenos");
  });

  test("no puede subir fotos a un garaje ajeno", () =>
    rejects(asUser(db, DRIVER, `insert into storage.objects (bucket_id, name) values ('garage-photos', $1)`, [`${garage}/x.jpg`])));

  test("no puede subir fotos de perfil a la carpeta de otra persona", () =>
    rejects(asUser(db, DRIVER, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${OTHER}/x.jpg`])));
});

describe("entradas maliciosas", () => {
  test("el texto con SQL se guarda como texto (sin inyección)", async () => {
    const evil = `x'); drop table profiles; --`;
    const [{ title }] = await asUser(db, OWNER, `update garages set description = $1 where id = $2 returning title`, [evil, garage]);
    assert.equal(title, "Garaje Centro");
    assert.ok((await asAdmin(db, `select count(*)::int n from profiles`))[0].n >= 3);
  });

  test("fechas inválidas en una reserva se rechazan", () =>
    rejects(asUser(db, DRIVER, `select create_booking($1, ${tomorrowAt(12)}, ${tomorrowAt(11)}, $2)`, [garage, cars[DRIVER]]), "past"));

  test("patente con caracteres raros se rechaza", () =>
    rejects(asUser(db, DRIVER, `insert into vehicles (brand, model, plate, size) values ('a', 'b', '<script>', 'moto')`)));
});

describe("abuso", () => {
  test("el límite de uso no se puede llamar desde la página", () =>
    rejects(asUser(db, DRIVER, `select rate_limit_hit('x', 1, 60)`), "permission denied"));

  test("el límite de uso corta al pasar el máximo", async () => {
    const hits = [];
    for (let i = 0; i < 4; i++) hits.push((await asAdmin(db, `select rate_limit_hit('prueba', 3, 3600) ok`))[0].ok);
    assert.deepEqual(hits, [true, true, true, false]);
  });

  test("un conductor no acapara lugares: una sola reserva esperando el pago", async () => {
    const [{ create_booking: first }] = await asUser(db, OTHER, `select create_booking($1, ${tomorrowAt(18)}, ${tomorrowAt(19)}, $2)`, [garage, cars[OTHER]]);
    const [{ create_booking: second }] = await asUser(db, OTHER, `select create_booking($1, ${tomorrowAt(20)}, ${tomorrowAt(21)}, $2)`, [garage, cars[OTHER]]);
    const rows = await asAdmin(db, `select id, status from bookings where driver_id = $1 and status = 'pendiente_pago'`, [OTHER]);
    assert.deepEqual(rows.map((r) => r.id), [second]);
    assert.equal((await asAdmin(db, `select status from bookings where id = $1`, [first]))[0].status, "cancelada");
  });
});
