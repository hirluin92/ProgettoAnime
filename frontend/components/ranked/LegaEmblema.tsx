import { SEGNO_TAGLIO } from "@/components/Logo";
import { COLORI_LEGA } from "@/lib/ranked";

// Stemmi di lega disegnati a tratto pieno, come timbri: tinta piatta, contorno nero, ombra sfalsata.
// La progressione si legge dalla sagoma, non solo dal colore:
//   Bronzo    scudo semplice
//   Argento   scudo + una lama per lato
//   Oro       scudo + due lame + corona a tre punte
//   Platino   esagono + tre lame + corona
//   Diamante  rombo + tre lame + corona a cinque punte + esplosione dietro
//   Campione  come sopra, esplosione doppia e il fendente dello stemma al centro
const ORDINE = ["Bronzo", "Argento", "Oro", "Platino", "Diamante", "Campione"];
const NERO = "#0e0d10";
const CARTA = "#f3ecdd";

const SAGOME = [
  "M100 30 158 50V112C158 152 132 182 100 200 68 182 42 152 42 112V50Z",
  "M100 30 158 50V112C158 152 132 182 100 200 68 182 42 152 42 112V50Z",
  "M100 30 158 50V112C158 152 132 182 100 200 68 182 42 152 42 112V50Z",
  "M100 28 160 58V140L100 202 40 140V58Z",
  "M100 24 164 104 100 204 36 104Z",
  "M100 24 150 56 164 110 100 204 36 110 50 56Z",
];
const INTERNI = [
  "M100 48 142 62V112C142 142 124 164 100 180 76 164 58 142 58 112V62Z",
  "M100 48 142 62V112C142 142 124 164 100 180 76 164 58 142 58 112V62Z",
  "M100 48 142 62V112C142 142 124 164 100 180 76 164 58 142 58 112V62Z",
  "M100 48 144 69V132L100 178 56 132V69Z",
  "M100 50 144 105 100 174 56 105Z",
  "M100 46 138 68 147 110 100 176 53 110 62 68Z",
];

const r1 = (n: number) => Math.round(n * 10) / 10;
function esplosione(punte: number, r0: number, r1max: number): string {
  return Array.from({ length: punte * 2 }, (_, i) => {
    const a = (i / (punte * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r0 : r1max;
    return `${r1(100 + Math.cos(a) * r)},${r1(112 + Math.sin(a) * r)}`;
  }).join(" ");
}
const ESPLOSIONE_1 = esplosione(14, 78, 104);
const ESPLOSIONE_2 = esplosione(20, 66, 92);

export default function LegaEmblema({
  lega,
  divisione,
  ignota,
  className,
}: {
  lega: string;
  divisione: string | null;
  ignota?: boolean;
  className?: string;
}) {
  const n = ignota ? 0 : Math.max(0, ORDINE.indexOf(lega));
  const c = ignota ? "#8f8c96" : (COLORI_LEGA[lega] ?? "#8f8c96");
  const lame = ignota ? 0 : Math.min(n, 3);
  const punte = n >= 4 ? 5 : n >= 2 ? 3 : 0;
  return (
    <svg
      viewBox="0 0 200 224"
      className={className}
      role="img"
      aria-label={`${lega} ${divisione ?? ""}`}
    >
      <g strokeLinejoin="round">
        {/* esplosione dietro (Diamante e Campione) */}
        {n >= 4 && (
          <polygon
            points={ESPLOSIONE_1}
            fill={n === 5 ? "#ffd21f" : NERO}
            stroke={NERO}
            strokeWidth="4"
          />
        )}
        {n === 5 && <polygon points={ESPLOSIONE_2} fill="#e0301f" stroke={NERO} strokeWidth="3" />}
        {/* lame ai lati: una in più a ogni lega */}
        {Array.from({ length: lame }, (_, i) => {
          const y = 70 + i * 26;
          return (
            <g key={i} fill={c} stroke={NERO} strokeWidth="4">
              <path d={`M48 ${y + 22} 6 ${y - 14 + i * 6} 30 ${y + 34}Z`} />
              <path d={`M152 ${y + 22} 194 ${y - 14 + i * 6} 170 ${y + 34}Z`} />
            </g>
          );
        })}
        {/* corona */}
        {punte === 3 && (
          <path
            d="M68 44 62 10 84 28 100 4 116 28 138 10 132 44Z"
            fill={c}
            stroke={NERO}
            strokeWidth="4"
          />
        )}
        {punte === 5 && (
          <path
            d="M62 46 50 14 72 30 82 6 100 26 118 6 128 30 150 14 138 46Z"
            fill={n === 5 ? "#ffd21f" : c}
            stroke={NERO}
            strokeWidth="4"
          />
        )}
        {/* ombra sfalsata e sagoma */}
        <path d={SAGOME[n]} fill={NERO} transform="translate(7 8)" />
        <path d={SAGOME[n]} fill={c} stroke={NERO} strokeWidth="5" />
        <path d={INTERNI[n]} fill={NERO} />
        {/* retino dentro lo scudo */}
        <path d={INTERNI[n]} fill={c} opacity="0.16" />
        {ignota ? (
          <text
            x="100"
            y="140"
            textAnchor="middle"
            fontSize="78"
            fill={CARTA}
            fontFamily="var(--font-num), var(--font-display), Impact, sans-serif"
          >
            ?
          </text>
        ) : divisione ? (
          <text
            x="100"
            y={n === 4 ? 128 : 132}
            textAnchor="middle"
            fontSize={divisione.length > 2 ? 40 : 54}
            fill={CARTA}
            fontFamily="var(--font-num), var(--font-display), Impact, sans-serif"
          >
            {divisione}
          </text>
        ) : n === 5 ? (
          <g transform="translate(100 108) scale(1.75) translate(-24 -24)">
            <path d={SEGNO_TAGLIO} fill={CARTA} />
          </g>
        ) : (
          // senza divisione: i galloni dicono il grado (uno per lega)
          <g fill="none" stroke={c} strokeWidth="7" strokeLinecap="square">
            {Array.from({ length: Math.min(n + 1, 3) }, (_, i) => (
              <path key={i} d={`M78 ${92 + i * 20} 100 ${106 + i * 20} 122 ${92 + i * 20}`} />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
