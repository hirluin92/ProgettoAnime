import type { ReactNode } from "react";
import { PENNELLO } from "@/lib/pennello";

// Icone disegnate a mano in SVG (stile lineare, 24×24), al posto delle emoji del sistema.
const LINEA: Record<string, ReactNode> = {
  swords: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
      <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" />
      <path d="M5 14l4 4M7 17l-3 3M3 19l2 2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M9 18h6M8 21h8" />
    </>
  ),
  ladder: <path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" />,
  cards: (
    <>
      <rect x="7" y="3" width="13" height="17" rx="2.2" />
      <path d="M4 7v12a2 2 0 0 0 2 2h9" />
      <path d="M13.5 8.5l1.1 2.3 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  sparkles: (
    <>
      <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" />
      <path d="M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2" />
    </>
  ),
  volcano: (
    <>
      <path d="M2 21 9 9h6l7 12z" />
      <path d="M10 9c-.6-2 1.2-3 .6-5.4M14 9c-.6-2 1.2-3 .6-5.4" />
    </>
  ),
  fog: (
    <path d="M3 8c3-2.5 5 2.5 9 0s5 2.5 9 0M3 13c3-2.5 5 2.5 9 0s5 2.5 9 0M3 18c3-2.5 5 2.5 9 0s5 2.5 9 0" />
  ),
  planet: (
    <>
      <circle cx="12" cy="12" r="5" />
      <ellipse cx="12" cy="12" rx="10" ry="3.4" transform="rotate(-24 12 12)" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z" />
      <path d="M10 20v-2.5M14 20v-2.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  flask: <path d="M9 3h6M10 3v6l-5.5 10a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3M7.5 15h9" />,
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5 17.5 12 12 17.5 6.5 12z" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5v5h4l5 4v-13l-5 4z" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5v5h4l5 4v-13l-5 4z" />
      <path d="M17 9.5l4 5M21 9.5l-4 5" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  arrowup: <path d="M12 20V5M5 12l7-7 7 7" />,
  arrowdown: <path d="M12 4v15M5 12l7 7 7-7" />,
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="3" />,
  arrowright: <path d="M4 12h15M13 5l7 7-7 7" />,
  arrowleft: <path d="M20 12H5M11 5l-7 7 7 7" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
};

const PIENE: Record<string, ReactNode> = {
  bolt: <path d="M13.5 2 4.5 14H11l-1 8 9-12.5h-6.5z" />,
  play: <path d="M7.5 4.5v15l12.5-7.5z" />,
  pause: (
    <>
      <rect x="6" y="4.5" width="4.5" height="15" rx="1.2" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1.2" />
    </>
  ),
  diamond: <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />,
  crown: <path d="M2.5 8.5 7 12l5-7.5L17 12l4.5-3.5L19.5 20h-15z" />,
  star: <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.3l-6.1 3.6 1.5-6.8L2.2 9.8l6.9-.7z" />,
  flame: (
    <path d="M12 2c.8 3.6 6 5.6 6 11.5a6 6 0 0 1-12 0c0-2.6 1.6-4.2 3-5.8.6 1.6 1.2 2.3 2.4 2.6C11 7.6 10.6 5 12 2z" />
  ),
};

export type NomeIcona = keyof typeof LINEA | keyof typeof PIENE;

export default function Icon({
  name,
  className = "size-[1.1em]",
}: {
  name: string;
  className?: string;
}) {
  // i simboli principali sono disegnati a pennello (contorni pieni a spessore variabile, lib/pennello.ts)
  if (name in PENNELLO)
    return (
      <svg
        viewBox="0 0 48 48"
        className={`inline-block shrink-0 align-[-0.15em] ${className}`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={PENNELLO[name]} />
      </svg>
    );
  const piena = name in PIENE;
  const corpo = piena ? PIENE[name] : LINEA[name];
  if (!corpo) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      fill={piena ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={piena ? 1.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {corpo}
    </svg>
  );
}

/** Posizione in classifica: un timbro colorato per i primi tre, un numero per gli altri. */
export function Medaglia({ pos }: { pos: number }) {
  const col = ["#ffd21f", "#cfd8e6", "#c9824a"][pos];
  if (!col)
    return <span className="num inline-block w-7 shrink-0 text-center text-xs">{pos + 1}</span>;
  return (
    <span
      className="num inline-grid size-7 shrink-0 -rotate-6 place-items-center border-2 border-black text-xs text-black shadow-[2px_2px_0_#000]"
      style={{ background: col }}
    >
      {pos + 1}
    </span>
  );
}
