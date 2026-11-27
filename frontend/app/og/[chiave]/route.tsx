import { ImageResponse } from "next/og";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import { conNome } from "@/lib/seo";
import { CARTA, LAMA, NERO, ROSSO, TIMBRO_SOPRA, TIMBRO_SOTTO } from "@/lib/stemma";

// Immagine di condivisione (Open Graph) per pagina, disegnata dal codice: stemma, nome del gioco e
// titolo della pagina su una striscia di carta nel colore della modalità. Nessuna immagine di personaggi.
// Una per ogni chiave di it.seo che ha il campo «og», generate una volta sola alla build.
const VOCI = it.seo as unknown as Record<string, { og?: string }>;
const TINTE: Record<string, string> = {
  duello: "#e0301f",
  giorno: "#e0301f",
  scala: "#e0301f",
  ranked: "#9a86ff",
  sfide: "#3fd0f0",
  animedle: "#3fd0f0",
  sigla: "#3fd0f0",
  scorcio: "#3fd0f0",
  personaggio: "#3fd0f0",
  album: "#35d68a",
  negozio: "#ffd21f",
  veloce: "#ff9238",
};

export const dynamic = "force-static";
export function generateStaticParams() {
  return Object.keys(VOCI)
    .filter((k) => VOCI[k]?.og)
    .map((chiave) => ({ chiave }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ chiave: string }> }) {
  const { chiave } = await params;
  const voce = VOCI[chiave];
  if (!voce?.og) return new Response("Not found", { status: 404 });
  const tinta = TINTE[chiave] ?? ROSSO;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: NERO,
        color: CARTA,
        padding: "0 70px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 28,
          display: "flex",
          background: tinta,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 8,
          display: "flex",
          background: CARTA,
        }}
      />
      <svg width="340" height="340" viewBox="0 0 48 48" style={{ marginRight: 56 }}>
        <path d={TIMBRO_SOPRA} fill={ROSSO} />
        <path d={TIMBRO_SOTTO} fill={ROSSO} />
        <path d={LAMA} fill={CARTA} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            display: "flex",
            fontSize: 132,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1,
            textTransform: "uppercase",
            textShadow: `7px 7px 0 ${ROSSO}`,
          }}
        >
          {APP_NAME}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            padding: "12px 26px",
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.15,
            color: NERO,
            background: CARTA,
            alignSelf: "flex-start",
            borderBottom: `10px solid ${tinta}`,
          }}
        >
          {conNome(voce.og)}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
