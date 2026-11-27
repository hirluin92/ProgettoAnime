"use client";

import { useId } from "react";
import { COLORI_LEGA } from "@/lib/ranked";

// Emblema di lega: scudo con ali, gemma centrale e numero di divisione.
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
  const id = useId().replace(/:/g, "");
  const c = ignota ? "#9a9488" : (COLORI_LEGA[lega] ?? "#9a9488");
  const ali = Math.max(
    1,
    ["Bronzo", "Argento", "Oro", "Platino", "Diamante", "Campione"].indexOf(lega),
  );
  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      role="img"
      aria-label={`${lega} ${divisione ?? ""}`}
    >
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={c} />
          <stop offset="1" stopColor={c} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`i${id}`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor={c} stopOpacity="0.5" />
          <stop offset="1" stopColor="#111014" />
        </radialGradient>
        <filter id={`b${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <ellipse cx="100" cy="110" rx="78" ry="86" fill={c} opacity="0.3" filter={`url(#b${id})`} />
      {/* ali: una coppia in più a ogni lega */}
      {Array.from({ length: Math.min(ali, 5) }, (_, i) => (
        <g key={i} opacity={0.95 - i * 0.08}>
          <path
            d={`M38 ${88 + i * 11} C14 ${78 + i * 11} 6 ${52 + i * 12} 14 ${34 + i * 12} C26 ${54 + i * 11} 36 ${64 + i * 10} 54 ${76 + i * 8} Z`}
            fill={`url(#m${id})`}
          />
          <path
            d={`M162 ${88 + i * 11} C186 ${78 + i * 11} 194 ${52 + i * 12} 186 ${34 + i * 12} C174 ${54 + i * 11} 164 ${64 + i * 10} 146 ${76 + i * 8} Z`}
            fill={`url(#m${id})`}
          />
        </g>
      ))}
      {/* scudo */}
      <path
        d="M100 14 L162 38 V108 C162 150 134 184 100 204 C66 184 38 150 38 108 V38 Z"
        fill={`url(#m${id})`}
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="2"
      />
      <path
        d="M100 26 L150 45 V107 C150 142 127 172 100 190 C73 172 50 142 50 107 V45 Z"
        fill={`url(#i${id})`}
        stroke="#000"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <path
        d="M100 38 L138 52 V106 C138 134 120 158 100 172 C80 158 62 134 62 106 V52 Z"
        fill="none"
        stroke={c}
        strokeOpacity="0.55"
      />
      {ignota ? (
        <text
          x="100"
          y="124"
          textAnchor="middle"
          fontSize="70"
          fontWeight="900"
          fill="#fff"
          fontFamily="var(--font-display), Impact, sans-serif"
        >
          ?
        </text>
      ) : (
        <>
          <path
            d="M100 56 L116 86 L100 118 L84 86 Z"
            fill={`url(#m${id})`}
            stroke="#fff"
            strokeOpacity="0.8"
          />
          <path d="M100 56 L116 86 H84 Z" fill="#fff" opacity="0.35" />
          {divisione && (
            <text
              x="100"
              y="156"
              textAnchor="middle"
              fontSize="40"
              fontWeight="900"
              fill="#fff"
              stroke="#000"
              strokeOpacity="0.4"
              strokeWidth="3"
              paintOrder="stroke"
              fontFamily="var(--font-display), Impact, sans-serif"
            >
              {divisione}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
