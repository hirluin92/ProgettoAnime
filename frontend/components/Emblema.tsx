import { ENSO, GOCCE, PENNELLO } from "@/lib/pennello";

/**
 * Emblema di una modalità: il simbolo a pennello dentro un cerchio d'inchiostro (ensō) nel colore
 * della modalità, con gli schizzi e l'ombra piena. È una piccola illustrazione, non un'icona:
 * va usato grande (schede della home, sfide, stati vuoti).
 */
export default function Emblema({
  nome,
  tinta = "var(--accent)",
  className = "size-24",
  segno = "var(--carta)",
}: {
  nome: string;
  tinta?: string;
  className?: string;
  segno?: string;
}) {
  const d = PENNELLO[nome];
  if (!d) return null;
  return (
    <svg viewBox="0 0 64 64" className={`emblema shrink-0 ${className}`} aria-hidden="true">
      <g className="emblema-enso" style={{ transformOrigin: "32px 32px" }}>
        <path d={ENSO} fill="#000" transform="translate(1.6 2.2)" />
        <path d={ENSO} fill={tinta} />
        <path d={GOCCE} fill={tinta} />
      </g>
      <g transform="translate(11 11) scale(0.875)">
        <path d={d} fill="#000" transform="translate(1.6 2.2)" />
        <path
          d={d}
          fill={segno}
          stroke="#000"
          strokeWidth="0.9"
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </g>
    </svg>
  );
}
