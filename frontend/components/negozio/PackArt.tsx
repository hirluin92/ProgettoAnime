"use client";

import { useId } from "react";

// Pacchetto di carte disegnato in SVG: busta metallizzata con bordi seghettati.
// Può essere mostrato intero, o diviso in «cima» e «corpo» lungo la linea di strappo.

export interface TemaPacchetto {
  a: string;
  b: string;
  accento: string;
  stelle: number;
}

export const TEMI_PACCHETTO: Record<string, TemaPacchetto> = {
  base: { a: "#6f7dff", b: "#2a2f9e", accento: "#b9c4ff", stelle: 1 },
  argento: { a: "#f1f5fb", b: "#7a879f", accento: "#ffffff", stelle: 2 },
  oro: { a: "#ffe58a", b: "#b86e0c", accento: "#fff4c9", stelle: 3 },
  leggendario: { a: "#ff6fb0", b: "#5b19c9", accento: "#ffd6ec", stelle: 4 },
};

export const W = 240;
export const H = 340;
/** Altezza della striscia che si strappa via (in unità del disegno). */
export const STRAPPO = 46;

// Linea di strappo irregolare, uguale per cima e corpo.
const PUNTI = 28;
const ZIGZAG = Array.from({ length: PUNTI + 1 }, (_, i) => {
  const n = Math.sin(i * 12.9898) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 1.5; // ±0,75 %
});
const Y0 = (STRAPPO / H) * 100;
const lineaStrappo = ZIGZAG.map(
  (z, i) => `${((i / PUNTI) * 100).toFixed(2)}% ${(Y0 + z).toFixed(2)}%`,
);
const CLIP_CIMA = `polygon(0 0, 100% 0, ${[...lineaStrappo].reverse().join(", ")})`;
const CLIP_CORPO = `polygon(${lineaStrappo.join(", ")}, 100% 100%, 0 100%)`;

function crimp(y0: number, su: boolean): string {
  // bordo seghettato (alette di saldatura) in alto o in basso
  const pts: string[] = [];
  const denti = 40;
  for (let i = 0; i <= denti; i++) {
    const x = (W / denti) * i;
    const y = i % 2 === 0 ? y0 : y0 + (su ? 9 : -9);
    pts.push(`${x.toFixed(1)},${y}`);
  }
  return pts.join(" ");
}

interface Props {
  tipo: string;
  nome: string;
  parte?: "intero" | "cima" | "corpo";
  className?: string;
}

export default function PackArt({ tipo, nome, parte = "intero", className }: Props) {
  const t = TEMI_PACCHETTO[tipo] ?? TEMI_PACCHETTO.base;
  const id = useId().replace(/:/g, "");
  const clip = parte === "cima" ? CLIP_CIMA : parte === "corpo" ? CLIP_CORPO : undefined;
  const righe = nome.replace(/^Pacchetto\s+/i, "");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ clipPath: clip }}
      role="img"
      aria-label={nome}
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="0.55" stopColor={t.b} />
          <stop offset="1" stopColor={t.a} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`v${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`e${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={t.accento} stopOpacity="0.95" />
          <stop offset="1" stopColor={t.accento} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <polygon
            points={`${crimp(0, true)} ${W},${H - 9} ${crimp(H, false).split(" ").reverse().join(" ")}`}
          />
        </clipPath>
        <pattern
          id={`p${id}`}
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(32)"
        >
          <rect width="14" height="14" fill="none" />
          <rect width="5" height="14" fill="#fff" opacity="0.07" />
        </pattern>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width={W} height={H} fill={`url(#g${id})`} />
        <rect width={W} height={H} fill={`url(#p${id})`} />
        <rect width={W} height={H} fill={`url(#v${id})`} />
        {/* alette di saldatura */}
        <rect width={W} height="20" fill="#000" opacity="0.18" />
        <rect y={H - 20} width={W} height="20" fill="#000" opacity="0.18" />
        {Array.from({ length: 22 }, (_, i) => (
          <line
            key={i}
            x1={6 + i * 11}
            y1="3"
            x2={6 + i * 11}
            y2="16"
            stroke="#fff"
            strokeOpacity="0.18"
          />
        ))}
        {Array.from({ length: 22 }, (_, i) => (
          <line
            key={i}
            x1={6 + i * 11}
            y1={H - 16}
            x2={6 + i * 11}
            y2={H - 3}
            stroke="#fff"
            strokeOpacity="0.18"
          />
        ))}
        {/* cornice */}
        <rect
          x="10"
          y="26"
          width={W - 20}
          height={H - 52}
          rx="14"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <rect
          x="16"
          y="32"
          width={W - 32}
          height={H - 64}
          rx="10"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.18"
        />
        {/* emblema */}
        <circle cx={W / 2} cy="150" r="78" fill={`url(#e${id})`} />
        <circle
          cx={W / 2}
          cy="150"
          r="52"
          fill="#0b0a18"
          fillOpacity="0.55"
          stroke="#fff"
          strokeOpacity="0.7"
          strokeWidth="2"
        />
        <circle
          cx={W / 2}
          cy="150"
          r="44"
          fill="none"
          stroke={t.accento}
          strokeOpacity="0.8"
          strokeDasharray="3 5"
        />
        <path
          d="M128 112 L101 156 H120 L110 190 L142 142 H123 Z"
          fill={t.accento}
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* stelle */}
        <g transform={`translate(${W / 2 - (t.stelle * 17) / 2 + 2} 222)`}>
          {Array.from({ length: t.stelle }, (_, i) => (
            <path
              key={i}
              transform={`translate(${i * 17} 0) scale(0.7)`}
              d="M12 1 L15.2 8.3 L23 9 L17 14.2 L18.8 22 L12 18 L5.2 22 L7 14.2 L1 9 L8.8 8.3 Z"
              fill={t.accento}
              stroke="#fff"
              strokeOpacity="0.7"
            />
          ))}
        </g>
        {/* titolo */}
        <text
          x={W / 2}
          y="262"
          textAnchor="middle"
          fontFamily="var(--font-display), Impact, sans-serif"
          fontSize="30"
          fontWeight="900"
          letterSpacing="1.5"
          fill="#fff"
          stroke="#000"
          strokeOpacity="0.35"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {righe.toUpperCase()}
        </text>
        <text
          x={W / 2}
          y="288"
          textAnchor="middle"
          fontFamily="var(--font-display), Impact, sans-serif"
          fontSize="13"
          letterSpacing="5"
          fill="#fff"
          fillOpacity="0.85"
        >
          ARENA ANIME
        </text>
        {/* riflesso che scorre */}
        <rect
          className="pack-shine"
          x="-120"
          width="90"
          height={H}
          fill={`url(#s${id})`}
          transform="skewX(-18)"
        />
      </g>
    </svg>
  );
}
