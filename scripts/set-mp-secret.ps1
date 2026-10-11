# Guarda el Client Secret de Mercado Pago como secreto de Supabase, leyéndolo
# del portapapeles (así no se pega en ninguna terminal ni chat).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\set-mp-secret.ps1

Write-Host ""
Write-Host "1) En Mercado Pago > Credenciales de producción, copiá el Client Secret (botón de copiar)."
Write-Host "2) Volvé acá y apretá Enter."
[void][System.Console]::ReadLine()

$s = (Get-Clipboard | Out-String).Trim()
if ($s.Length -lt 20 -or $s -match "\s") {
  Write-Host "Lo que hay copiado no parece un Client Secret (largo: $($s.Length)). No se guardó nada. Probá de nuevo."
  exit 1
}
Write-Host "Clave copiada: $($s.Substring(0,4))... ($($s.Length) caracteres). Guardando..."
npx -y supabase@latest secrets set --project-ref qdyncjxfigrsigzongqh "MP_CLIENT_SECRET=$s"
Set-Clipboard -Value " "
Write-Host "Listo. (Vacié el portapapeles por seguridad.)"
