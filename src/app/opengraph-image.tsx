import { ImageResponse } from "next/og";

// Imagen que muestran WhatsApp, Instagram, X, Facebook y Google al compartir
// un enlace de GuSpot. Se genera al compilar (sitio estático).
export const dynamic = "force-static";
export const alt = "GuSpot: encontrá dónde estacionar, con lugar y precio a la vista";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #2453e0 0%, #1c3797 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* La G con techo de garaje (símbolo de GuSpot). */}
            <svg width="80" height="80" viewBox="0 0 512 512">
              <path
                d="M398 214 256 104 114 214v186h284v-96H284"
                fill="none"
                stroke="#2453e0"
                strokeWidth="56"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
            <span>Gu</span>
            <span style={{ color: "#ffd95c" }}>Spot</span>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 52, fontWeight: 700, lineHeight: 1.15, maxWidth: 960 }}>
          Encontrá dónde estacionar, con lugar y precio a la vista
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#dbe6ff" }}>
          Garajes cerca tuyo con lugares libres en vivo · guspotapp.com
        </div>
      </div>
    ),
    size,
  );
}
