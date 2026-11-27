import { paletteFor } from "@/lib/animePalette";

// Illustrazione originale generata dal codice: nessuna immagine ufficiale.
// Ogni personaggio ottiene una figura diversa (capelli, accessorio, scintille)
// in modo deterministico dal nome, con i colori del suo anime.

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const HAIR: string[] = [
  // spettinati a punte
  "M30 44 L26 26 L37 34 L41 18 L49 31 L56 16 L60 32 L70 22 L68 40 Q50 30 30 44Z",
  // lunghi
  "M28 46 Q26 24 50 22 Q74 24 72 46 L76 74 L66 56 Q50 44 34 56 L24 74Z",
  // corti puliti
  "M29 44 Q28 22 50 22 Q72 22 71 44 Q50 34 29 44Z",
  // ciuffo laterale
  "M28 46 Q30 22 54 22 Q72 24 72 42 Q60 30 44 38 Q36 44 28 46Z",
  // a cresta
  "M42 36 L40 14 L50 24 L58 12 L60 36 Q50 30 42 36Z",
  // con coda
  "M29 44 Q28 22 50 22 Q72 22 71 44 Q50 34 29 44Z M66 34 Q86 34 82 62 Q76 48 66 44Z",
];

function accessory(role: string, from: string, to: string) {
  switch (role) {
    case "Capitano":
      return (
        <>
          <path d="M18 100 Q30 74 50 82 Q70 74 82 100Z" fill={to} opacity=".9" />
          <path
            d="M50 6 L53 14 L61 14 L55 19 L57 27 L50 22 L43 27 L45 19 L39 14 L47 14Z"
            fill="#fff"
            opacity=".85"
          />
        </>
      );
    case "Tank":
      return (
        <>
          <ellipse cx="22" cy="80" rx="15" ry="9" fill="#121115" stroke={from} strokeWidth="2" />
          <ellipse cx="78" cy="80" rx="15" ry="9" fill="#121115" stroke={from} strokeWidth="2" />
        </>
      );
    case "Guaritore":
      return (
        <>
          <ellipse cx="50" cy="12" rx="22" ry="5" fill="none" stroke="#fff6a8" strokeWidth="2.5" />
          <path d="M47 82 h6 v-6 h6 v-6 h-6 v-6 h-6 v6 h-6 v6 h6z" fill="#7dffb2" opacity=".9" />
        </>
      );
    case "Danno":
      return (
        <>
          <circle cx="80" cy="42" r="9" fill={from} opacity=".9" />
          <circle cx="80" cy="42" r="14" fill="none" stroke={from} strokeWidth="1.5" opacity=".6" />
        </>
      );
    case "Vice":
      return <path d="M82 18 L88 24 L56 70 L52 66Z" fill="#e8f0ff" opacity=".9" />;
    default:
      return <path d="M34 78 Q50 92 66 78 L62 70 Q50 82 38 70Z" fill={from} opacity=".95" />;
  }
}

export default function CardArt({
  name,
  anime,
  role,
  idPrefix,
}: {
  name: string;
  anime: string;
  role: string;
  idPrefix: string;
}) {
  const pal = paletteFor(anime);
  const h = hash(name);
  const hair = HAIR[h % HAIR.length];
  const eye = ["#fff", "#9ff", "#ffd36e", "#ff9fb8"][(h >> 3) % 4];
  const rays = Array.from({ length: 14 }, (_, i) => i * (360 / 14));
  const sparks = Array.from({ length: 7 }, (_, i) => ({
    x: 8 + ((h >> (i * 2)) % 84),
    y: 6 + ((h >> (i * 3 + 1)) % 50),
    r: 0.8 + ((h >> i) % 3) * 0.6,
  }));
  const g = `${idPrefix}-g`;
  const b = `${idPrefix}-b`;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <radialGradient id={g} cx="50%" cy="42%" r="65%">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".35" stopColor={pal.from} stopOpacity=".75" />
          <stop offset="1" stopColor={pal.to} stopOpacity="1" />
        </radialGradient>
        <linearGradient id={b} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241f3f" />
          <stop offset="1" stopColor="#0b0a0d" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${g})`} />
      <g transform="translate(50 46)" className="card-rays" opacity=".22">
        {rays.map((a) => (
          <path key={a} d="M0 0 L-5 -70 L5 -70Z" fill="#fff" transform={`rotate(${a})`} />
        ))}
      </g>
      {sparks.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity=".8" className="card-spark" />
      ))}
      {accessory(role, pal.from, pal.to)}
      <path
        d="M10 100 Q14 70 36 66 L50 74 L64 66 Q86 70 90 100Z"
        fill={`url(#${b})`}
        stroke={pal.from}
        strokeWidth="1.6"
      />
      <rect x="43" y="58" width="14" height="14" rx="4" fill="#15122b" />
      <ellipse cx="50" cy="46" rx="19" ry="22" fill="#1c1838" stroke={pal.from} strokeWidth="1.6" />
      <path d={hair} fill="#121115" stroke={pal.from} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M38 48 L46 50" stroke={eye} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M62 48 L54 50" stroke={eye} strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="50" cy="100" rx="46" ry="10" fill={pal.from} opacity=".25" />
    </svg>
  );
}
