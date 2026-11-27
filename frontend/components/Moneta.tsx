import it from "@/i18n/it.json";

/**
 * Il SIGILLO: la moneta del gioco. Un gettone giallo con il bordo zigrinato e, al centro,
 * un rombo nero (lo stesso delle gemme d'energia e della rarità) tagliato dalla lama dello stemma.
 * - piccolo (accanto ai numeri): bastano disco, rombo e fendente
 * - grande (negozio, premi): bordo zigrinato, spessore sfalsato, retino e riflesso
 * `gira` lo fa ruotare una volta su se stesso (quando si guadagna o si spende).
 */
export default function Moneta({
  className = "size-[1.15em]",
  grande = false,
  gira = false,
  tre = false,
  titolo,
}: {
  className?: string;
  grande?: boolean;
  gira?: boolean;
  /** gettone 3D vero (solo CSS): due facce, costa a strati, ombra a terra; dondola e, con `gira`, fa un lancio */
  tre?: boolean;
  titolo?: string;
}) {
  if (tre)
    return (
      <span
        className={`moneta3d shrink-0 ${className}`}
        data-gira={gira ? "" : undefined}
        role={titolo ? "img" : undefined}
        aria-label={titolo}
        aria-hidden={titolo ? undefined : true}
      >
        <span className="moneta3d-ombra" />
        <span className="moneta3d-giro">
          <Faccia style={{ transform: "translateZ(-5px) rotateY(180deg)" }} />
          {[4, 3, 2, 1].map((k) => (
            <i key={k} style={{ transform: `translateZ(${-k}px)` }} />
          ))}
          <Faccia />
        </span>
      </span>
    );
  return (
    <svg
      viewBox="0 0 48 48"
      className={`inline-block shrink-0 align-[-0.2em] ${gira ? "moneta-gira" : ""} ${className}`}
      role={titolo ? "img" : undefined}
      aria-label={titolo}
      aria-hidden={titolo ? undefined : true}
    >
      {grande && <circle cx="25.5" cy="26" r="20.5" fill="#0e0d10" />}
      {grande && (
        <circle cx="24.6" cy="25" r="20.5" fill="#a37f00" stroke="#0e0d10" strokeWidth="2" />
      )}
      <circle
        cx="23"
        cy="23"
        r="20.5"
        fill="#ffd21f"
        stroke="#0e0d10"
        strokeWidth={grande ? 2 : 3}
      />
      {grande && (
        <>
          {/* bordo zigrinato */}
          <circle
            cx="23"
            cy="23"
            r="17.6"
            fill="none"
            stroke="#0e0d10"
            strokeWidth="2.2"
            strokeDasharray="1.2 2.49"
            opacity="0.75"
          />
          {/* mezzaluna di luce */}
          <path
            d="M8.5 20A15 15 0 0 1 21 8.2"
            fill="none"
            stroke="#fff6c2"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      )}
      <path d="M23 9.5 36.5 23 23 36.5 9.5 23z" fill="#0e0d10" />
      <path d="M36 9.5 24.6 23.9 10 36.5 21.4 22.1z" fill="#f3ecdd" />
    </svg>
  );
}

/** Numero di sigilli con la moneta davanti: «◈ 250». */
export function Sigilli({ n, className = "" }: { n: number | string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] ${className}`}>
      <Moneta titolo={it.moneta.nome} />
      <span className="num">{n}</span>
    </span>
  );
}

/** Una faccia del gettone 3D: disco pieno, zigrinatura, rombo tagliato, mezzaluna di luce. */
function Faccia({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" style={style} aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" fill="#ffd21f" stroke="#0e0d10" strokeWidth="2" />
      <circle
        cx="24"
        cy="24"
        r="19.2"
        fill="none"
        stroke="#0e0d10"
        strokeWidth="2.2"
        strokeDasharray="1.2 2.49"
        opacity="0.75"
      />
      <path d="M24 10 38 24 24 38 10 24z" fill="#0e0d10" />
      <path d="M37 10.5 25.6 24.9 11 37.5 22.4 23.1z" fill="#f3ecdd" />
      <path
        d="M8.6 20.5A16 16 0 0 1 21.5 8"
        fill="none"
        stroke="#fff6c2"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
