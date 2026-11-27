"use client";

import { useId } from "react";

// Bustina disegnata in SVG: foglio metallico con puntini, bordi a coste, cornice olografica.
// Si può mostrare intera, o divisa in «cima» e «corpo» lungo la linea di strappo.

export interface TemaPacchetto {
  a: string;
  b: string;
  accento: string;
  stelle: number;
}

export const TEMI_PACCHETTO: Record<string, TemaPacchetto> = {
  base: { a: "#6f7dff", b: "#1d2275", accento: "#c3ccff", stelle: 1 },
  argento: { a: "#e9eef7", b: "#5c6985", accento: "#ffffff", stelle: 2 },
  oro: { a: "#ffd966", b: "#8f4f06", accento: "#fff1bd", stelle: 3 },
  leggendario: { a: "#ff5fa8", b: "#4a0fa8", accento: "#ffd0ea", stelle: 4 },
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

const STELLINE = [
  [30, 140, 0.9],
  [212, 160, 0.7],
  [24, 250, 0.6],
  [216, 300, 0.9],
  [40, 340, 0.7],
  [200, 120, 0.6],
];

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
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="0.5" stopColor={t.b} />
          <stop offset="1" stopColor={t.a} stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id={`v${id}`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5f6d" />
          <stop offset="0.25" stopColor="#ffc371" />
          <stop offset="0.5" stopColor="#7df9ff" />
          <stop offset="0.75" stopColor="#a98bff" />
          <stop offset="1" stopColor="#ff5f6d" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor="#c7cfdd" />
          <stop offset="1" stopColor="#7d879b" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`e${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={t.accento} stopOpacity="0.6" />
          <stop offset="1" stopColor={t.accento} stopOpacity="0" />
        </radialGradient>
        <pattern id={`p${id}`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1" fill="#fff" opacity="0.2" />
        </pattern>
        <pattern id={`c${id}`} width="4" height="10" patternUnits="userSpaceOnUse">
          <rect width="1.6" height="10" fill="#fff" opacity="0.32" />
          <rect x="1.6" width="2.4" height="10" fill="#000" opacity="0.2" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#g${id})`} />
      <rect width={W} height={H} fill={`url(#p${id})`} />
      <rect width={W} height={H} fill={`url(#v${id})`} />
      {/* raggi di luce */}
      <g opacity="0.12" fill="#fff">
        {Array.from({ length: 9 }, (_, i) => (
          <polygon
            key={i}
            points={`${W / 2},215 ${-60 + i * 45},0 ${-30 + i * 45},0`}
            opacity={i % 2 ? 0.5 : 1}
          />
        ))}
      </g>
      {/* bordi a coste */}
      <rect width={W} height="30" fill={`url(#c${id})`} />
      <rect y={H - 30} width={W} height="30" fill={`url(#c${id})`} />
      <rect y="30" width={W} height="2" fill="#000" opacity="0.3" />
      <rect y={H - 32} width={W} height="2" fill="#000" opacity="0.3" />
      <rect y="29" width={W} height="1.5" fill="#fff" opacity="0.5" />
      <rect y={H - 31} width={W} height="1.5" fill="#fff" opacity="0.5" />
      {/* stelline */}
      {STELLINE.map(([x, y, o], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) scale(0.45)`}
          d="M0 -8 L2.4 -2.4 L8 0 L2.4 2.4 L0 8 L-2.4 2.4 L-8 0 L-2.4 -2.4 Z"
          fill="#fff"
          opacity={o}
        />
      ))}
      {/* marchio in alto */}
      <text
        x={W / 2}
        y="74"
        textAnchor="middle"
        fontFamily="var(--font-display), Impact, sans-serif"
        fontSize="34"
        fontWeight="900"
        letterSpacing="1.5"
        fill={`url(#m${id})`}
        stroke="#000"
        strokeOpacity="0.45"
        strokeWidth="3"
        paintOrder="stroke"
      >
        ARENA ANIME
      </text>
      <rect
        x="62"
        y="86"
        width="116"
        height="24"
        rx="7"
        fill="#0b0a18"
        fillOpacity="0.75"
        stroke="#fff"
        strokeOpacity="0.45"
      />
      <text
        x={W / 2}
        y="104"
        textAnchor="middle"
        fontFamily="var(--font-display), Impact, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="3"
        fill="#fff"
      >
        {titolo}
      </text>
      {/* cornice olografica */}
      <circle cx={W / 2} cy="232" r="105" fill={`url(#e${id})`} />
      <rect x="40" y="130" width="160" height="206" rx="14" fill="#0b0a18" fillOpacity="0.72" />
      <rect
        x="40"
        y="130"
        width="160"
        height="206"
        rx="14"
        fill="none"
        stroke={`url(#h${id})`}
        strokeWidth="5"
      />
      <rect
        x="47"
        y="137"
        width="146"
        height="192"
        rx="9"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.18"
      />
      <path
        transform={`translate(${W / 2 - 34} 150) scale(2.8)`}
        d="M13.5 2 4.5 14H11l-1 8 9-12.5h-6.5z"
        fill={`url(#m${id})`}
        stroke="#fff"
        strokeOpacity="0.6"
        strokeWidth="0.5"
      />
      <text
        x={W / 2}
        y="262"
        textAnchor="middle"
        fontFamily="var(--font-display), Impact, sans-serif"
        fontSize={titolo.length > 8 ? 25 : titolo.length > 5 ? 36 : 44}
        fontWeight="900"
        letterSpacing="2"
        fill={`url(#h${id})`}
        stroke="#000"
        strokeOpacity="0.4"
        strokeWidth="2"
        paintOrder="stroke"
      >
        {titolo}
      </text>
      <g transform={`translate(${W / 2 - (t.stelle * 22) / 2 + 3} 280)`}>
        {Array.from({ length: t.stelle }, (_, i) => (
          <path
            key={i}
            transform={`translate(${i * 22} 0) scale(0.8)`}
            d="M12 1 L15.2 8.3 L23 9 L17 14.2 L18.8 22 L12 18 L5.2 22 L7 14.2 L1 9 L8.8 8.3 Z"
            fill={t.accento}
            stroke="#fff"
            strokeOpacity="0.8"
          />
        ))}
      </g>
      {carte && (
        <>
          <text
            x={W / 2}
            y="372"
            textAnchor="middle"
            fontFamily="var(--font-display), Impact, sans-serif"
            fontSize="22"
            fontWeight="800"
            letterSpacing="2"
            fill="#fff"
            fillOpacity="0.9"
          >
            {carte} CARTE
          </text>
          <text
            x={W / 2}
            y="386"
            textAnchor="middle"
            fontSize="7"
            letterSpacing="2.5"
            fill="#fff"
            fillOpacity="0.6"
          >
            DA COLLEZIONE
          </text>
        </>
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
    </svg>
  );
}
