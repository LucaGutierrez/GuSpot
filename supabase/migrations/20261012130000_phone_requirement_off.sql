-- 2026-10-12: el usuario pidió apagar por ahora la verificación del celular
-- (no hay proveedor de SMS). Para publicar alcanza con los datos personales y
-- la verificación de identidad (DNI + cara con Didit). Para volver a prenderla:
--   update public.app_settings set value = 'true' where key = 'require_phone_verification';
update public.app_settings set value = 'false'
 where key = 'require_phone_verification';
