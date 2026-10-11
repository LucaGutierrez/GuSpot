/** Foto de perfil redonda; sin foto, la inicial del nombre. */
export function Avatar({ url, name, size = 40 }: { url: string; name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- sitio estático, sin optimización de imágenes
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        (name.trim().charAt(0) || "?").toUpperCase()
      )}
    </span>
  );
}
