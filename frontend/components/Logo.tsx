import { APP_NAME } from "@/lib/constants";
import { CARTA, LAMA, ROSSO, TIMBRO_SOPRA, TIMBRO_SOTTO } from "@/lib/stemma";

/**
 * Lo stemma: un timbro tagliato in due da un fendente (ink + kiri = «taglio d'inchiostro»).
 * `SegnoStemma` è il solo disegno, da mettere dentro un altro SVG (riquadro 48×48):
 *  - pieno: metà vermiglie, lama carta
 *  - una tinta (`tinta`): le due metà in quel colore, il taglio è il vuoto fra loro
 */
export function SegnoStemma({
  tinta,
  lama = CARTA,
  timbro = ROSSO,
}: {
  tinta?: string;
  lama?: string | null;
  timbro?: string;
}) {
  const c = tinta ?? timbro;
  return (
    <g strokeLinejoin="round">
      <path d={TIMBRO_SOPRA} fill={c} stroke={c} strokeWidth="1.6" />
      <path d={TIMBRO_SOTTO} fill={c} stroke={c} strokeWidth="1.6" />
      {!tinta && lama && <path d={LAMA} fill={lama} />}
    </g>
  );
}

export function Logo({ size = 34, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <SegnoStemma tinta={mono ? "currentColor" : undefined} />
    </svg>
  );
}

/** Stemma + nome: il marchio completo. Il nome arriva sempre da APP_NAME. */
export function Marchio({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <span
        className="display italic leading-none text-carta"
        style={{ fontSize: size * 0.72, letterSpacing: "0.04em" }}
      >
        {APP_NAME}
      </span>
    </span>
  );
}

export default Logo;
