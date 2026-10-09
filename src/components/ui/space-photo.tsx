import type { PhotoVariant } from "@/lib/types";

// "Fotos de muestra": ilustraciones SVG generadas en código. No son fotos
// reales de ningún espacio; la carga de fotos todavía no está implementada.

const palettes: Record<PhotoVariant, { sky: string; ground: string; wall: string; detail: string }> = {
  garage: { sky: "#dbe6ff", ground: "#8d95a5", wall: "#f7f8fa", detail: "#2453e0" },
  cochera: { sky: "#fff4cc", ground: "#5f6879", wall: "#eef0f4", detail: "#f5b301" },
  patio: { sky: "#d7f5e8", ground: "#9fb39c", wall: "#ffffff", detail: "#0f766e" },
  subsuelo: { sky: "#333a48", ground: "#5f6879", wall: "#8d95a5", detail: "#ffd95c" },
  porton: { sky: "#bfd3ff", ground: "#8d95a5", wall: "#dde1e8", detail: "#1c41bd" },
};

function Car({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 30 L12 10 H58 L72 30 V44 H0 Z" fill={color} />
      <path d="M16 13 H54 L63 28 H8 Z" fill="#ffffff" opacity="0.55" />
      <circle cx="16" cy="44" r="8" fill="#121722" />
      <circle cx="56" cy="44" r="8" fill="#121722" />
    </g>
  );
}

export function SpacePhoto({
  variant,
  label = "Ilustración de muestra",
  className = "",
  url,
}: {
  variant: PhotoVariant;
  label?: string;
  className?: string;
  /** Foto real (garages reales). Si está, se muestra en lugar de la ilustración. */
  url?: string;
}) {
  if (url) {
    return (
      <div className={`relative overflow-hidden bg-ink-100 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- exportación estática sin optimizador */}
        <img src={url} alt={label} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
    );
  }
  const p = palettes[variant];
  return (
    <div className={`relative overflow-hidden bg-ink-100 ${className}`}>
      <svg
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-label={label}
      >
        <rect width="320" height="200" fill={p.sky} />
        {variant === "subsuelo" && (
          <>
            {[40, 120, 200, 280].map((x) => (
              <rect key={x} x={x - 6} y="0" width="12" height="140" fill={p.wall} />
            ))}
            {[60, 160, 260].map((x) => (
              <circle key={x} cx={x} cy="18" r="6" fill={p.detail} />
            ))}
          </>
        )}
        {(variant === "garage" || variant === "porton") && (
          <>
            <path d="M40 140 V60 L160 20 L280 60 V140 Z" fill={p.wall} />
            <rect x="85" y="70" width="150" height="70" fill={p.detail} opacity={variant === "porton" ? 0.9 : 0.25} />
            {variant === "porton" &&
              [80, 92, 104, 116, 128].map((y) => (
                <rect key={y} x="85" y={y} width="150" height="3" fill="#ffffff" opacity="0.5" />
              ))}
          </>
        )}
        {variant === "cochera" && (
          <>
            <rect x="20" y="40" width="280" height="100" fill={p.wall} />
            <rect x="20" y="40" width="280" height="12" fill={p.detail} />
          </>
        )}
        {variant === "patio" && (
          <>
            <circle cx="270" cy="40" r="18" fill="#ffd95c" />
            <rect x="0" y="95" width="320" height="45" fill={p.wall} />
            {[30, 70, 250, 290].map((x) => (
              <circle key={x} cx={x} cy="88" r="16" fill={p.detail} opacity="0.7" />
            ))}
          </>
        )}
        <rect y="140" width="320" height="60" fill={p.ground} />
        {[90, 230].map((x) => (
          <rect key={x} x={x} y="150" width="4" height="50" fill="#ffffff" opacity="0.8" />
        ))}
        {variant !== "porton" && <Car x={124} y={104} color={variant === "subsuelo" ? "#ffc823" : "#2453e0"} />}
        <g transform="translate(18 158)">
          <rect width="26" height="26" rx="6" fill="#2453e0" />
          <text x="13" y="19" textAnchor="middle" fontSize="17" fontWeight="700" fill="#ffffff" fontFamily="sans-serif">
            P
          </text>
        </g>
      </svg>
      <span className="absolute right-2 bottom-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
        {label}
      </span>
    </div>
  );
}
