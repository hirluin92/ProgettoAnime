"use client";

import { useId } from "react";
import { SegnoStemma } from "@/components/Logo";
import { APP_NAME } from "@/lib/constants";

// Bustina disegnata in SVG come una copertina a stampa: tinta piatta, retino, linee cinetiche,
// fascia nera col nome del gioco, lo stemma dentro un'esplosione. Ogni livello ha la sua tinta:
// Base carta e inchiostro, Argento grigio e ciano, Oro giallo, Leggendario vermiglio e oro.
// Si può mostrare intera, o divisa in «cima» e «corpo» lungo la linea di strappo.

export interface TemaPacchetto {
  a: string; // tinta della bustina
  b: string; // tinta scura (fondi)
  accento: string; // tinta dei titoli fuori dalla bustina
  stelle: number;
  spot: string; // secondo colore di stampa (esplosione)
  linee: number; // quante linee cinetiche
}

export const TEMI_PACCHETTO: Record<string, TemaPacchetto> = {
  base: { a: "#f3ecdd", b: "#8d8676", accento: "#f3ecdd", stelle: 1, spot: "#e0301f", linee: 14 },
  argento: {
    a: "#bfd3dc",
    b: "#2f6f86",
    accento: "#8fe4f7",
    stelle: 2,
    spot: "#1fb4d8",
    linee: 20,
  },
  oro: { a: "#ffd21f", b: "#a37f00", accento: "#ffd21f", stelle: 3, spot: "#e0301f", linee: 28 },
  leggendario: {
    a: "#e0301f",
    b: "#8c1a10",
    accento: "#ff5a45",
    stelle: 4,
    spot: "#ffd21f",
    linee: 40,
  },
};

export const W = 240;
export const H = 420;
/** Altezza della striscia che si strappa via (in unità del disegno). */
export const STRAPPO = 46;

// Linea di strappo irregolare, uguale per cima e corpo.
const PUNTI = 32;
const ZIGZAG = Array.from({ length: PUNTI + 1 }, (_, i) => {
  const n = Math.sin(i * 12.9898) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 1.2; // ±0,6 %
});
const Y0 = (STRAPPO / H) * 100;
const lineaStrappo = ZIGZAG.map(
  (z, i) => `${((i / PUNTI) * 100).toFixed(2)}% ${(Y0 + z).toFixed(2)}%`,
);
const CLIP_CIMA = `polygon(0 0, 100% 0, ${[...lineaStrappo].reverse().join(", ")})`;
const CLIP_CORPO = `polygon(${lineaStrappo.join(", ")}, 100% 100%, 0 100%)`;

const r1 = (n: number) => Math.round(n * 10) / 10;
// esplosione a punte dietro lo stemma
const ESPLOSIONE = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const r = i % 2 ? 62 : 86 + (i % 4 === 0 ? 10 : 0);
  return `${r1(120 + Math.cos(a) * r)},${r1(222 + Math.sin(a) * r)}`;
}).join(" ");

interface Props {
  tipo: string;
  nome: string;
  carte?: number;
  parte?: "intero" | "cima" | "corpo";
  className?: string;
}

export default function PackArt({ tipo, nome, carte, parte = "intero", className }: Props) {
  const t = TEMI_PACCHETTO[tipo] ?? TEMI_PACCHETTO.base;
  const id = useId().replace(/:/g, "");
  const clip = parte === "cima" ? CLIP_CIMA : parte === "corpo" ? CLIP_CORPO : undefined;
  const titolo = nome.replace(/^Pacchetto\s+/i, "").toUpperCase();
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ clipPath: clip }}
      role="img"
      aria-label={nome}
    >
      <defs>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`p${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.7" fill="#0e0d10" opacity="0.3" />
        </pattern>
        <pattern id={`c${id}`} width="5" height="10" patternUnits="userSpaceOnUse">
          <rect width="2" height="10" fill="#0e0d10" opacity="0.55" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={t.a} />
      {/* linee cinetiche dal centro */}
      <g fill="#0e0d10" opacity="0.2">
        {Array.from({ length: t.linee }, (_, i) => {
          const a = (i / t.linee) * Math.PI * 2;
          const l = 0.035 + (i % 3) * 0.012;
          return (
            <polygon
              key={i}
              points={`120,222 ${r1(120 + Math.cos(a - l) * 420)},${r1(222 + Math.sin(a - l) * 420)} ${r1(120 + Math.cos(a + l) * 420)},${r1(222 + Math.sin(a + l) * 420)}`}
            />
          );
        })}
      </g>
      {/* retino in diagonale */}
      <polygon points={`0,${H} 0,250 ${W},330 ${W},${H}`} fill={`url(#p${id})`} />
      <polygon points={`0,0 ${W},0 ${W},110 0,170`} fill={`url(#p${id})`} opacity="0.6" />
      {/* bordi a coste */}
      <rect width={W} height="28" fill={t.b} />
      <rect width={W} height="28" fill={`url(#c${id})`} />
      <rect y={H - 28} width={W} height="28" fill={t.b} />
      <rect y={H - 28} width={W} height="28" fill={`url(#c${id})`} />
      <rect y="28" width={W} height="3" fill="#0e0d10" />
      <rect y={H - 31} width={W} height="3" fill="#0e0d10" />
      {/* fascia nera con il nome del gioco */}
      <polygon points={`0,66 ${W},56 ${W},104 0,114`} fill="#0e0d10" />
      <polygon points={`0,114 ${W},104 ${W},109 0,119`} fill={t.spot} />
      <text
        x={W / 2}
        y="98"
        textAnchor="middle"
        transform={`rotate(-2.4 ${W / 2} 86)`}
        fontFamily="var(--font-display), Impact, sans-serif"
        fontStyle="italic"
        fontSize={APP_NAME.length > 9 ? 28 : 36}
        letterSpacing="2"
        fill="#f3ecdd"
      >
        {APP_NAME.toUpperCase()}
      </text>
      {/* esplosione e stemma */}
      <polygon points={ESPLOSIONE} fill="#0e0d10" transform="translate(5 6)" />
      <polygon
        points={ESPLOSIONE}
        fill={t.spot}
        stroke="#0e0d10"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g transform="translate(120 222) scale(2) translate(-24 -24)">
        <SegnoStemma timbro="#0e0d10" />
      </g>
      {/* nome del livello */}
      <text
        x={W / 2}
        y="338"
        textAnchor="middle"
        transform={`rotate(-4 ${W / 2} 330)`}
        fontFamily="var(--font-num), var(--font-display), Impact, sans-serif"
        fontSize={titolo.length > 8 ? 24 : titolo.length > 5 ? 32 : 42}
        fill="#f3ecdd"
        stroke="#0e0d10"
        strokeWidth="7"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {titolo}
      </text>
      <g transform={`translate(${W / 2 - ((t.stelle - 1) * 20) / 2} 356)`}>
        {Array.from({ length: t.stelle }, (_, i) => (
          <rect
            key={i}
            x={i * 20 - 6}
            y="-6"
            width="12"
            height="12"
            transform={`rotate(45 ${i * 20} 0)`}
            fill="#f3ecdd"
            stroke="#0e0d10"
            strokeWidth="2.5"
          />
        ))}
      </g>
      {carte && (
        <g>
          <polygon points="74,372 170,372 164,390 68,390" fill="#0e0d10" />
          <text
            x={W / 2 - 1}
            y="386.5"
            textAnchor="middle"
            fontFamily="var(--font-display), Impact, sans-serif"
            fontSize="15"
            letterSpacing="2.5"
            fill="#f3ecdd"
          >
            {carte} CARTE
          </text>
        </g>
      )}
      {/* riflesso che scorre */}
      <rect
        className="pack-shine"
        x="-120"
        width="80"
        height={H}
        fill={`url(#s${id})`}
        transform="skewX(-18)"
      />
      <rect width={W} height={H} fill="none" stroke="#0e0d10" strokeWidth="4" />
    </svg>
  );
}
