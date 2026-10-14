# Copias de la base

Una tarea de GitHub (`.github/workflows/copia-diaria.yml`) baja todos los días a las 4:00 una copia **cifrada** de la base de Supabase. Además, como se conecta todos los días, el proyecto gratis de Supabase **no se pausa** por falta de uso.

- Qué entra: tablas de GuSpot (perfiles, vehículos, garajes, reservas, avisos, pagos), cuentas (`auth.users`) y el registro de archivos.
- Qué NO entra: las fotos (DNI, licencia, seguro, garajes, perfiles). Están en Supabase Storage.
- Dónde queda: GitHub → pestaña **Actions** → "Copia diaria de la base" → cada ejecución tiene el archivo `copia-guspot-…` (se guarda 30 días).
- El repositorio es público: por eso la copia va cifrada. Sin la contraseña no se puede leer.

## Activarla (una sola vez)

1. **Cadena de conexión de la base:** Supabase → proyecto Guspot → botón **Connect** → pestaña de conexión directa → **Session pooler** (funciona desde GitHub). Copiarla y reemplazar `[YOUR-PASSWORD]` por la contraseña de la base. Si no la recordás: Project Settings → Database → **Reset database password** (no corta nada de la app: la página no usa esa contraseña).
2. **Contraseña de las copias:** inventar una larga (por ejemplo cuatro palabras al azar) y **guardarla** en un lugar seguro. Si se pierde, las copias no se pueden abrir.
3. En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = la cadena del paso 1
   - `BACKUP_PASSWORD` = la contraseña del paso 2
4. Probarla: pestaña **Actions** → "Copia diaria de la base" → **Run workflow**. Tiene que terminar en verde.

Ojo: en repositorios públicos GitHub **apaga las tareas programadas si el repositorio pasa 60 días sin cambios** (avisa por email). Se reactiva con un clic en Actions.

## Abrir una copia

1. Bajar el archivo `copia-guspot-….zip` desde Actions y descomprimirlo: queda `guspot-AAAA-MM-DD.tar.gz.gpg`.
2. En la terminal de Git Bash (viene con Git para Windows):

   ```sh
   gpg -d guspot-AAAA-MM-DD.tar.gz.gpg > guspot.tar.gz   # pide la contraseña de las copias
   tar -xzf guspot.tar.gz                                  # deja public.sql y cuentas-y-archivos.sql
   ```

3. Restaurar en un proyecto de Supabase vacío: primero `cuentas-y-archivos.sql` (cuentas), después `public.sql`. Hacerlo con ayuda: pisar la base en uso borra lo que se haya cargado después de la copia.
