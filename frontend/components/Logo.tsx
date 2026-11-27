import { APP_NAME } from "@/lib/constants";

/**
 * Lo stemma: un timbro vermiglio (come il sigillo che firma una tavola) attraversato da un fendente
 * che ne esce dai bordi. Il fendente con le due barre disegna una «Z», ma si legge prima come taglio:
 * resta valido con qualsiasi nome.
 * - piena: timbro rosso, taglio carta
 * - mono: una sola tinta (currentColor), il taglio è un vuoto
 */
export const SEGNO_TAGLIO =
  "M45.5 2.5 28.6 27.4H36l1.6 6.1H20.4L2.5 45.5l16.9-24.9H12l-1.6-6.1h17.2z";

export function Logo({ size = 34, mono = false }: { size?: number; mono?: boolean }) {
  if (mono)
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path
          fillRule="evenodd"
          fill="currentColor"
          d={`M11.2 6.6 37.9 4.2a5 5 0 0 1 5.4 4.5l2.4 26.7a5 5 0 0 1-4.5 5.4l-26.7 2.4a5 5 0 0 1-5.4-4.5L6.7 12a5 5 0 0 1 4.5-5.4z ${SEGNO_TAGLIO}`}
        />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M11.2 6.6 37.9 4.2a5 5 0 0 1 5.4 4.5l2.4 26.7a5 5 0 0 1-4.5 5.4l-26.7 2.4a5 5 0 0 1-5.4-4.5L6.7 12a5 5 0 0 1 4.5-5.4z"
        fill="#e0301f"
      />
      <path d={SEGNO_TAGLIO} fill="#0e0d10" transform="translate(1.6 1.8)" opacity=".55" />
      <path d={SEGNO_TAGLIO} fill="#f3ecdd" />
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
