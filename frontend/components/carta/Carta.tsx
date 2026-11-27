"use client";

import { useState, type ReactNode } from "react";
import { SegnoStemma } from "@/components/Logo";
import { SHOW_IMAGES } from "@/lib/api";
import { paletteFor } from "@/lib/animePalette";

/**
 * LA carta del gioco: un solo disegno per tutto il sito (stile in globals.css, blocco «LA CARTA»).
 * Le misure sono in em e l'em segue la larghezza della carta: basta darle una larghezza.
 *  - piena: arte, costo, potenza, targa del nome, (facoltativo) riquadro dei testi
 *  - mano:  come la piena ma più bassa, senza testi
 *  - mini:  quadrata, per le corsie: arte, potenza, nome sulla cornice
 * Rarità: comune (grigio piatto), rara (ciano + retino), epica (magenta + linee cinetiche + riflesso),
 * leggendaria (lamina d'oro che scorre, raggi, targa gialla).
 */

export type Rarita = "comune" | "rara" | "epica" | "leggendaria";

export function raritaDi(rating: number): Rarita {
  if (rating >= 90) return "leggendaria";
  if (rating >= 82) return "epica";
  if (rating >= 72) return "rara";
  return "comune";
}
const ROMBI: Record<Rarita, number> = { comune: 1, rara: 2, epica: 3, leggendaria: 4 };

export interface CartaProps {
  nome: string;
  anime: string;
  rating: number;
  immagine?: string | null;
  costo?: number;
  potenza?: number;
  /** potenza di base: se diversa da `potenza` la targa diventa verde o rossa */
  base?: number;
  sotto?: string;
  forma?: string | null;
  misura?: "piena" | "mano" | "mini";
  testi?: ReactNode;
  scelta?: boolean;
  spenta?: boolean;
  /** ferma le animazioni di lamina e riflesso (griglie con molte carte) */
  fermo?: boolean;
  nomeACapo?: boolean;
  onClick?: () => void;
  testId?: string;
  ariaLabel?: string;
  className?: string;
  /** inclinazione 3D che segue il puntatore, con la lamina che scorre (carte grandi) */
  tilt?: boolean;
  /** contenuto extra sopra l'arte (es. illustrazione di ripiego) */
  arte?: ReactNode;
  title?: string;
}

export default function Carta({
  nome,
  anime,
  rating,
  immagine,
  costo,
  potenza,
  base,
  sotto,
  forma,
  misura = "piena",
  testi,
  scelta,
  spenta,
  fermo,
  nomeACapo,
  onClick,
  testId,
  ariaLabel,
  className = "",
  arte,
  title,
  tilt,
}: CartaProps) {
  const pal = paletteFor(anime);
  const rarita = raritaDi(rating);
  const [rotta, setRotta] = useState(false);
  const conImmagine = SHOW_IMAGES && !!immagine && !rotta;
  const delta = potenza !== undefined && base !== undefined ? potenza - base : 0;
  const mini = misura === "mini";
  // inclinazione: solo variabili CSS (--rx, --ry, --mx, --my), nessun render di React
  const inclina = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const st = e.currentTarget.style;
    st.setProperty("--rx", `${((0.5 - y) * 14).toFixed(1)}deg`);
    st.setProperty("--ry", `${((x - 0.5) * 16).toFixed(1)}deg`);
    st.setProperty("--mx", x.toFixed(2));
    st.setProperty("--my", y.toFixed(2));
    st.setProperty("--gl", "1");
  };
  const raddrizza = (e: React.PointerEvent<HTMLElement>) => {
    const st = e.currentTarget.style;
    st.setProperty("--rx", "0deg");
    st.setProperty("--ry", "0deg");
    st.setProperty("--gl", "0");
  };
  const corpo = (
    <span className="carta-corpo block">
      <span className="carta-quadro block">
        <span
          className="carta-arte"
          style={{ ["--da" as string]: pal.from, ["--a" as string]: pal.to }}
        >
          {conImmagine ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={immagine ?? ""}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setRotta(true)}
            />
          ) : (
            (arte ?? <span className="carta-sigla">{nome.charAt(0)}</span>)
          )}
        </span>
        <i className="carta-fx" aria-hidden="true" />
        <i className="carta-ombra" aria-hidden="true" />
        {(rarita === "epica" || rarita === "leggendaria") && !mini && (
          <i className="carta-lucido" aria-hidden="true" />
        )}
        {tilt && <i className="carta-foil" aria-hidden="true" />}
        {costo !== undefined && !mini && <span className="carta-costo">{costo}</span>}
        {potenza !== undefined && (
          <span className="carta-pot" data-delta={delta > 0 ? "su" : delta < 0 ? "giu" : undefined}>
            {potenza}
          </span>
        )}
        {forma && !mini && <span className="carta-forma">{forma}</span>}
        {!mini && (
          <span className="carta-targa block">
            <span className="carta-nome" data-acapo={nomeACapo ? "" : undefined}>
              {nome}
            </span>
            <span className="carta-sotto">
              <span>{sotto}</span>
              <span className="carta-rombi" aria-hidden="true">
                {Array.from({ length: ROMBI[rarita] }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            </span>
          </span>
        )}
      </span>
      {mini && (
        <span className="block truncate px-[0.15em] pt-[0.2em] text-[max(10px,1.05em)] font-black uppercase leading-[1.15] tracking-wide text-black">
          {nome.split(" ")[0]}
        </span>
      )}
      {testi && <span className="carta-testi">{testi}</span>}
    </span>
  );
  const attr = {
    className: `carta ${className}`,
    "data-rarita": rarita,
    "data-misura": misura,
    "data-testi": testi ? "" : undefined,
    "data-scelta": scelta ? "" : undefined,
    "data-spenta": spenta ? "" : undefined,
    "data-fermo": fermo ? "" : undefined,
    "data-tilt": tilt ? "" : undefined,
    ...(tilt
      ? { onPointerMove: inclina, onPointerLeave: raddrizza, onPointerCancel: raddrizza }
      : {}),
    "data-testid": testId,
    title,
  };
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={ariaLabel} {...attr}>
      {corpo}
    </button>
  ) : (
    <div aria-label={ariaLabel} {...attr}>
      {corpo}
    </div>
  );
}

/** Il retro: nero d'inchiostro, bordo carta, linee cinetiche e lo stemma al centro. */
export function CartaRetro({ className = "" }: { className?: string }) {
  return (
    <div className={`carta-retro ${className}`} aria-hidden="true">
      <div>
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="retro-retino" width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="0.9" fill="#f3ecdd" opacity="0.22" />
            </pattern>
          </defs>
          <rect width="100" height="140" fill="#121115" />
          <g stroke="#f3ecdd" strokeWidth="0.5" opacity="0.2">
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i / 36) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={Math.round(500 + Math.cos(a) * 340) / 10}
                  y1={Math.round(700 + Math.sin(a) * 340) / 10}
                  x2={Math.round(500 + Math.cos(a) * 1200) / 10}
                  y2={Math.round(700 + Math.sin(a) * 1200) / 10}
                />
              );
            })}
          </g>
          <path d="M0 0h100v38L0 62z" fill="url(#retro-retino)" />
          <path d="M100 140H0v-38l100-24z" fill="url(#retro-retino)" />
          <rect
            x="6"
            y="6"
            width="88"
            height="128"
            rx="5"
            fill="none"
            stroke="#f3ecdd"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <g transform="translate(50 70) scale(1.25) translate(-24 -24)">
            <SegnoStemma />
          </g>
        </svg>
      </div>
    </div>
  );
}
