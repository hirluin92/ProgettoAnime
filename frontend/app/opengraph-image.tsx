import { ImageResponse } from "next/og";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";

// Immagine di condivisione (Open Graph / Twitter) disegnata dal codice: stemma, nome e motto.
// Il nome arriva da APP_NAME, come nel resto del sito. Nessuna immagine di personaggi.
export const alt = it.meta.ogAlt.replace("{app}", APP_NAME);
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLIO = "M45.5 2.5 28.6 27.4H36l1.6 6.1H20.4L2.5 45.5l16.9-24.9H12l-1.6-6.1h17.2z";
const TIMBRO =
  "M11.2 6.6 37.9 4.2a5 5 0 0 1 5.4 4.5l2.4 26.7a5 5 0 0 1-4.5 5.4l-26.7 2.4a5 5 0 0 1-5.4-4.5L6.7 12a5 5 0 0 1 4.5-5.4z";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#0e0d10",
        color: "#f3ecdd",
        padding: "0 80px",
        position: "relative",
      }}
    >
      {/* retino in alto a destra e fascia vermiglia in basso */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 620,
          height: 630,
          display: "flex",
          backgroundImage: "radial-gradient(circle at 9px 9px, #3a2422 4px, transparent 5px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 26,
          display: "flex",
          background: "#e0301f",
        }}
      />
      <svg width="330" height="330" viewBox="0 0 48 48" style={{ marginRight: 60 }}>
        <path d={TIMBRO} fill="#e0301f" />
        <path d={TAGLIO} fill="#000000" opacity="0.5" transform="translate(1.6 1.8)" />
        <path d={TAGLIO} fill="#f3ecdd" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 900,
            fontStyle: "italic",
            letterSpacing: -2,
            lineHeight: 1,
            textTransform: "uppercase",
            textShadow: "7px 7px 0 #e0301f",
          }}
        >
          {APP_NAME}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 34,
            padding: "10px 26px",
            fontSize: 44,
            fontWeight: 800,
            textTransform: "uppercase",
            color: "#0e0d10",
            background: "#f3ecdd",
            alignSelf: "flex-start",
          }}
        >
          {it.meta.motto}
        </div>
      </div>
    </div>,
    size,
  );
}
