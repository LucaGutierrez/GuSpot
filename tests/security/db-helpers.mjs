// Base de datos de prueba para las pruebas de seguridad: un Postgres en memoria
// (PGlite) con TODAS las migraciones de supabase/migrations aplicadas en orden.
// No se conecta a Supabase ni a ningún servicio: corre aislado en la máquina.
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../supabase/migrations");

// Lo mínimo de Supabase que usan las migraciones: esquemas auth y storage,
// roles anon/authenticated y auth.uid() (acá sale de la tabla _ctx).
const SUPABASE_STUB = `
create schema auth; create schema extensions; create schema storage;
create role anon; create role authenticated; create role service_role;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage, auth, public, extensions to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql as
  $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
create table public._ctx (uid uuid); insert into public._ctx values (null);
grant select on public._ctx to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$ select uid from public._ctx $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
set search_path = public, extensions;
`;

export const OWNER = "11111111-1111-4111-8111-111111111111";
export const DRIVER = "22222222-2222-4222-8222-222222222222";
export const OTHER = "33333333-3333-4333-8333-333333333333";

export async function createDb() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE_STUB);
  for (const file of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }
  return db;
}

/** Consulta como el sistema (sin reglas de seguridad). */
export async function asAdmin(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}

/**
 * Consulta como un usuario: `uid` con sesión (rol authenticated) o null
 * (anónimo). Devuelve las filas o lanza el error de la base.
 */
export async function asUser(db, uid, sql, params = []) {
  await db.query("update public._ctx set uid = $1", [uid]);
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

/** Datos de ejemplo: un garaje publicado con Mercado Pago, y dos conductores verificados. */
export async function seed(db) {
  for (const id of [OWNER, DRIVER, OTHER]) {
    await asAdmin(db, `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id,
      `${id.slice(0, 4)}@ejemplo.test`,
      JSON.stringify({ first_name: "Ana", last_name: "Pérez", dni: "30123456", birth_date: "1990-01-01", phone: "+541122334455" }),
    ]);
  }
  await asAdmin(db, `update profiles set identity_status = 'verificada', phone_verified = true,
                       license_number = '30123456', license_category = 'B1', license_expiry = '2035-01-01'`);
  for (const id of [DRIVER, OTHER]) {
    for (const doc of ["licencia-frente", "licencia-dorso"]) {
      await asAdmin(db, `insert into storage.objects (bucket_id, name) values ('identity-docs', $1)`, [`${id}/${doc}`]);
    }
  }
  const [{ id: garage }] = await asUser(db, OWNER, `
    insert into garages (title, city, neighborhood, approx_location, type, max_vehicle, hourly_price,
                         min_hours, availability, capacity, available_spots, reservable_spots)
    values ('Garaje Centro', 'CABA', 'Retiro', 'Cerca de Plaza San Martín', 'cubierta', 'camioneta', 300000, 1,
            '[{"days":[0,1,2,3,4,5,6],"from":"00:00","to":"24:00"}]', 20, 5, 2)
    returning id`);
  await asUser(db, OWNER, `insert into garage_private (garage_id, address, exact_lat, exact_lng, arrival_instructions)
                           values ($1, 'Florida 100', -34.6, -58.37, 'Portón negro, tocar timbre')`, [garage]);
  await asUser(db, OWNER, `update garages set status = 'publicado' where id = $1`, [garage]);
  await asAdmin(db, `insert into mp_accounts (owner_id, mp_user_id, access_token) values ($1, 1, 'token-de-prueba')`, [OWNER]);
  const cars = {};
  for (const [id, plate] of [[DRIVER, "AB123CD"], [OTHER, "AC456EF"]]) {
    [{ id: cars[id] }] = await asUser(db, id, `
      insert into vehicles (brand, model, color, plate, size, insurer, insurance_policy, insurance_expiry)
      values ('Fiat', 'Cronos', 'Gris', $1, 'auto_mediano', 'La Caja', '123456', '2035-01-01') returning id`, [plate]);
  }
  return { garage, cars };
}

/** Mañana a las HH:00 (hora argentina), en el formato de la base. */
export const tomorrowAt = (h) => `(ar_now() + interval '1 day')::date + time '${String(h).padStart(2, "0")}:00'`;
