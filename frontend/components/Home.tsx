"use client";

import Emblema from "@/components/Emblema";
import Icon from "@/components/Icon";
import { ENSO, FENDENTE, GOCCE } from "@/lib/pennello";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CharacterCard from "@/components/battle/CharacterCard";
import type { DraftOptions } from "@/lib/draft";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import { saveToken } from "@/lib/ws";

type Hero = Parameters<typeof CharacterCard>[0]["character"];

// Ripiego (illustrazioni originali) se il backend dorme o non risponde.
const HERO: Hero[] = [
  {
    nome: "Tanjiro Kamado",
    anime: "demon-slayer",
    arch: "BRU",
    mossa: { nome: "Hinokami Kagura" },
    rating: 84,
  },
  {
    nome: "Satoru Gojo",
    anime: "jujutsu-kaisen",
    arch: "MAG",
    mossa: { nome: "Vuoto Viola" },
    rating: 97,
  },
  {
    nome: "Monkey D. Luffy",
    anime: "one-piece",
    arch: "BRU",
    mossa: { nome: "Gomu Gomu Gatling" },
    rating: 93,
  },
];

function pickHeroes(o: DraftOptions): Hero[] {
  const all = o.hands
    .flatMap((h) => h.cards)
    .map((x) => x.character)
    .filter((c) => !!c.immagine_url && c.rating >= 84);
  const seen = new Set<string>();
  const out: Hero[] = [];
  for (const c of all.sort((a, b) => b.rating - a.rating)) {
    if (seen.has(c.anime)) continue;
    seen.add(c.anime);
    out.push(c);
    if (out.length === 3) break;
  }
  return out.length === 3 ? [out[1], out[0], out[2]] : HERO;
}

/**
 * La scena d'apertura, disegnata a inchiostro: un grande cerchio a pennello vermiglio, una lama che
 * entra di taglio con la sua pennellata, schizzi e retino; davanti, tre carte che arrivano una dopo
 * l'altra. I piani si muovono con il puntatore a velocità diverse (parallasse): solo variabili CSS.
 */
function Tavola({ heroes }: { heroes: Hero[] }) {
  const roles = ["Danno", "Capitano", "Supporto"];
  const pos = [
    "left-[2%] top-[22%] w-[35%] -rotate-[10deg]",
    "left-1/2 top-[6%] z-10 w-[41%] -translate-x-1/2",
    "right-[2%] top-[20%] w-[35%] rotate-[9deg]",
  ];
  const profondita = [14, 24, 17];
  const muovi = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--px",
      (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(2),
    );
    e.currentTarget.style.setProperty(
      "--py",
      (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(2),
    );
  };
  const fermo = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--px", "0");
    e.currentTarget.style.setProperty("--py", "0");
  };
  return (
    <div
      className="scena mx-auto aspect-[10/9] w-full max-w-[36rem]"
      aria-hidden="true"
      onPointerMove={muovi}
      onPointerLeave={fermo}
    >
      <svg
        viewBox="0 0 400 360"
        className="absolute inset-0 size-full overflow-visible"
        data-piano=""
        style={{ ["--z" as string]: -10 }}
      >
        <defs>
          <pattern id="scena-retino" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="4.5" cy="4.5" r="1.7" fill="#f3ecdd" opacity="0.35" />
          </pattern>
        </defs>
        <circle cx="318" cy="250" r="112" fill="url(#scena-retino)" />
        <g className="scena-enso" style={{ transformOrigin: "200px 176px" }}>
          <g transform="translate(22 -2) scale(5.55)">
            <path d={ENSO} fill="#000" transform="translate(1 1.4)" />
            <path d={ENSO} fill="#e0301f" />
            <path d={GOCCE} fill="#e0301f" />
          </g>
        </g>
      </svg>
      <svg
        viewBox="0 0 400 360"
        className="absolute inset-0 size-full overflow-visible"
        data-piano=""
        style={{ ["--z" as string]: -4 }}
      >
        <g className="scena-lama">
          {/* la pennellata del fendente e la lama */}
          <g transform="translate(34 338) rotate(-41) scale(2.2 2.6)">
            <path d={FENDENTE} fill="#0e0d10" transform="translate(0 -9)" />
          </g>
          <g transform="translate(70 316) rotate(-41)">
            <path
              d="M0 -8 250 -6Q292 -5 322 0 290 7 250 7L0 8Z"
              fill="#f3ecdd"
              stroke="#000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M6 2Q60 6 120 2T240 2Q280 2 300 0L250 6 6 7Z" fill="#0e0d10" opacity="0.22" />
            <rect
              x="-10"
              y="-19"
              width="11"
              height="38"
              rx="3"
              fill="#ffd21f"
              stroke="#000"
              strokeWidth="3"
            />
            <rect
              x="-86"
              y="-8"
              width="77"
              height="16"
              rx="3"
              fill="#0e0d10"
              stroke="#000"
              strokeWidth="3"
            />
            <path
              d="M-80 0l8-7 8 7-8 7zM-62 0l8-7 8 7-8 7zM-44 0l8-7 8 7-8 7zM-26 0l8-7 8 7-8 7z"
              fill="#e0301f"
            />
            <rect
              x="-94"
              y="-10"
              width="9"
              height="20"
              rx="3"
              fill="#ffd21f"
              stroke="#000"
              strokeWidth="3"
            />
          </g>
        </g>
        <g className="scena-schizzo" fill="#0e0d10" stroke="#f3ecdd" strokeWidth="1.2">
          <circle cx="352" cy="46" r="9" />
          <circle cx="374" cy="66" r="4.5" />
          <circle cx="338" cy="24" r="3" />
          <circle cx="40" cy="300" r="6" />
        </g>
      </svg>
      {heroes.map((h, i) => (
        <div
          key={h.nome}
          className={`absolute ${pos[i]}`}
          data-piano=""
          style={{ ["--z" as string]: profondita[i] }}
        >
          <div className="scena-carta" style={{ ["--i" as string]: i }}>
            <div className="float" style={{ ["--i" as string]: i }}>
              <CharacterCard character={h} role={roles[i]} fluid />
            </div>
          </div>
        </div>
      ))}
      <span className="absolute -left-1 top-0 z-20" data-piano="" style={{ ["--z" as string]: 30 }}>
        <span
          className="onoma colpo text-[clamp(2.6rem,9vw,4.8rem)]"
          style={{ ["--i" as string]: 13 }}
        >
          {it.home.grido}
        </span>
      </span>
      <span
        className="balloon reveal absolute bottom-[1%] right-0 z-20 text-sm sm:text-base"
        style={{ ["--i" as string]: 16 }}
      >
        {it.home.balloon}
      </span>
    </div>
  );
}

function Vignetta({
  href,
  icon,
  title,
  text,
  accent,
  n,
  className = "",
  grande,
  piccola,
  cta = it.home.vai,
}: {
  href: string;
  icon: string;
  title: string;
  text: string;
  accent: string;
  n: string;
  className?: string;
  grande?: boolean;
  /** tessera compatta: icona, titolo e una riga; niente retino né numero */
  piccola?: boolean;
  cta?: string;
}) {
  if (piccola)
    return (
      <Link
        href={href}
        className={`panel-hover group flex min-h-[4.75rem] items-center gap-2.5 p-2.5 sm:p-3 ${className}`}
        style={{ ["--accent" as string]: accent }}
      >
        <Emblema nome={icon} tinta={accent} className="size-14 sm:size-16" />
        <span className="min-w-0">
          <span className="display block text-xl leading-none sm:text-2xl">{title}</span>
          <span className="mt-1 hidden text-sm font-medium leading-snug muted sm:block">
            {text}
          </span>
        </span>
      </Link>
    );
  return (
    <Link
      href={href}
      className={`panel-hover group relative isolate flex min-h-[9.5rem] flex-col overflow-hidden p-5 ${grande ? "md:p-8" : ""} ${className}`}
      style={{ ["--accent" as string]: accent }}
    >
      {grande && (
        <i
          aria-hidden="true"
          className="retino absolute inset-y-0 right-0 -z-10 w-3/5 opacity-40"
          style={{
            WebkitMaskImage: "linear-gradient(250deg, #000, transparent 75%)",
            maskImage: "linear-gradient(250deg, #000, transparent 75%)",
          }}
        />
      )}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -z-10 transition-transform duration-300 group-hover:scale-105 ${
          grande ? "-bottom-6 -right-4 md:-bottom-10 md:-right-6" : "-bottom-5 -right-3"
        }`}
      >
        <Emblema
          nome={icon}
          tinta={accent}
          className={grande ? "size-52 md:size-[22rem]" : "size-32"}
        />
      </span>
      <span className="flex items-center gap-2">
        <span className="num text-sm" style={{ color: accent }}>
          {n}
        </span>
        {grande && (
          <span className="chip border-black bg-carta text-nero">{it.home.principale}</span>
        )}
      </span>
      <span
        className={`display mt-1 block italic leading-[0.95] ${grande ? "text-5xl md:text-7xl" : "text-3xl"}`}
      >
        {title}
      </span>
      <span
        className={`mt-2 block font-medium leading-snug muted ${grande ? "max-w-[19rem] text-base md:max-w-sm md:text-lg" : "max-w-[62%] text-[0.95rem]"}`}
      >
        {text}
      </span>
      {grande ? (
        <span className="btn btn-primary mt-auto w-fit px-7 text-lg">
          <Icon name={icon} className="size-[1.1em]" /> {cta}
        </span>
      ) : (
        <span
          className="display mt-auto flex items-center gap-2 pt-4 text-lg tracking-wider"
          style={{ color: accent }}
        >
          {cta}
          <span
            aria-hidden="true"
            className="inline-block h-[3px] w-8 bg-current transition-all duration-200 group-hover:w-14"
          />
        </span>
      )}
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [streamer, setStreamer] = useState(false);
  const [channel, setChannel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [heroes, setHeroes] = useState<Hero[]>(HERO);

  useEffect(() => {
    let alive = true;
    api<DraftOptions>("/api/quick/draft")
      .then((o) => alive && setHeroes(pickHeroes(o)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const create = async (modo?: "quiz") => {
    setError(null);
    try {
      const r = await api<{ code: string; token: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name, streamer_channel: streamer ? channel : null }),
      });
      saveToken(r.code, r.token);
      router.push(modo === "quiz" ? `/stanza/${r.code}?modo=quiz` : `/stanza/${r.code}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const join = async () => {
    setError(null);
    try {
      await api(`/api/rooms/${code.trim().toUpperCase()}`);
      router.push(`/stanza/${code.trim().toUpperCase()}`);
    } catch (e) {
      // «non trovata» solo se il server l'ha detto davvero; altrimenti è un problema di rete
      const m = (e as Error).message.toLowerCase();
      setError(
        m.includes("non trovata") || m.includes("404")
          ? it.errori.stanzaNonTrovata
          : it.errori.serverNonRaggiungibile,
      );
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-5 sm:pt-10">
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="min-w-0 space-y-6">
          <header className="space-y-4">
            <span className="eyebrow reveal" style={{ ["--i" as string]: 0 }}>
              {it.home.eyebrow}
            </span>
            <h1
              className="taglio text-grad text-[clamp(4.6rem,21vw,10.5rem)] leading-[0.84] tracking-normal lg:text-[clamp(6rem,11.5vw,11rem)]"
              data-testo={APP_NAME}
            >
              <span>{APP_NAME}</span>
              <i aria-hidden="true" />
            </h1>
            <p
              className="reveal max-w-lg text-lg font-medium leading-relaxed text-[#dcd5c5]"
              style={{ ["--i" as string]: 2 }}
            >
              {it.home.sottotitolo}
            </p>
          </header>

          <div className="reveal space-y-3" style={{ ["--i" as string]: 3 }}>
            <Link
              href="/duello"
              className="btn btn-primary min-h-16 w-full px-8 text-2xl sm:w-auto"
              data-testid="cta-duello"
            >
              <Icon name="swords" className="size-[1.1em]" /> {it.home.ctaDuello}
            </Link>
            <p className="text-sm font-bold muted">{it.home.sottoCta}</p>
          </div>

          {/* i tre secondari: pulsanti veri, a rilievo, con l'emblema nel colore della modalità */}
          <ul
            className="reveal grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3"
            style={{ ["--i" as string]: 4 }}
          >
            {(
              [
                { href: "/ranked", icona: "crown", tinta: "#9a86ff", testo: it.home.ctaRanked },
                {
                  href: "/duello/giorno",
                  icona: "trophy",
                  tinta: "#ffd21f",
                  testo: it.home.ctaSfidaGiorno,
                  testId: "cta-sfida-giorno",
                },
                {
                  href: "#amici",
                  icona: "music",
                  tinta: "#ff5fa8",
                  testo: it.home.ctaAmici,
                  testId: "cta-quiz-amici",
                },
              ] as { href: string; icona: string; tinta: string; testo: string; testId?: string }[]
            ).map((v) => (
              <li key={v.href}>
                <Link
                  href={v.href}
                  data-testid={v.testId}
                  className="btn h-full min-h-[4.75rem] w-full flex-col gap-1 px-1.5 py-2 text-[0.92rem] leading-tight sm:min-h-14 sm:flex-row sm:gap-2 sm:px-3 sm:text-base"
                >
                  <Emblema nome={v.icona} tinta={v.tinta} className="size-9 sm:size-10" />
                  <span>{v.testo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Tavola heroes={heroes} />
      </section>

      <section className="mt-20 space-y-6 sm:mt-28">
        <div>
          <span className="eyebrow">{it.home.modalita}</span>
          <h2 className="mt-1 text-4xl leading-none sm:text-5xl">{it.home.modalitaTitolo}</h2>
        </div>
        {/* impaginata come una tavola: una vignetta grande e le altre attorno */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Vignetta
            href="/duello"
            icon="swords"
            n="01"
            title={it.home.duelloTitolo}
            text={it.home.duelloTesto}
            accent="#ff5a45"
            grande
            cta={it.home.ctaDuello}
            className="min-h-[15rem] lg:min-h-0"
          />
          <div className="grid gap-6">
            <Vignetta
              href="/ranked"
              icon="crown"
              n="02"
              title={it.home.rankedTitolo}
              text={it.home.rankedTesto}
              accent="#9a86ff"
            />
            <Vignetta
              href="/sfide"
              icon="sparkles"
              n="03"
              title={it.home.sfideTitolo}
              text={it.home.sfideTesto}
              accent="#3fd0f0"
            />
          </div>
        </div>
        {/* il resto sta sotto «Altro»: tre porte in vista, le altre un tocco più in là */}
        <details className="group" data-testid="home-altro">
          <summary className="btn w-fit cursor-pointer list-none">
            {it.home.altro}
            <span className="text-sm font-medium muted">{it.home.altroSotto}</span>
          </summary>
          <div className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-5">
            <Vignetta
              piccola
              href="/scala"
              icon="ladder"
              n="04"
              title={it.home.scalaTitolo}
              text={it.home.scalaBreve}
              accent="#ff5fa8"
            />
            <Vignetta
              piccola
              href="/veloce"
              icon="bolt"
              n="05"
              title={it.home.veloceTitolo}
              text={it.home.veloceBreve}
              accent="#ff9238"
            />
            <Vignetta
              piccola
              href="/duello/giorno"
              icon="trophy"
              n="06"
              title={it.home.sfidaBreveTitolo}
              text={it.home.sfidaBreve}
              accent="#ffd21f"
            />
            <Vignetta
              piccola
              href="/album"
              icon="cards"
              n="07"
              title={it.nav.album}
              text={it.home.albumBreve}
              accent="#35d68a"
            />
            <Vignetta
              piccola
              href="/negozio"
              icon="coin"
              n="08"
              title={it.home.negozioTitolo}
              text={it.home.negozioBreve}
              accent="#ffd21f"
              className="max-lg:col-span-2"
            />
          </div>
        </details>
      </section>

      <section
        className="mt-20 grid scroll-mt-20 items-start gap-10 sm:mt-28 lg:grid-cols-[1fr_1.1fr]"
        id="amici"
        style={{ ["--accent" as string]: "var(--magenta)" }}
      >
        <div className="space-y-4">
          <span className="eyebrow">{it.home.amiciEyebrow}</span>
          <h2 className="text-5xl leading-[0.95] sm:text-6xl">{it.home.amiciTitolo}</h2>
          <p className="max-w-md font-medium muted">{it.home.amiciTesto}</p>
          <ol className="grid gap-3 pt-2">
            {it.home.passi.map((p) => (
              <li key={p.n} className="flex items-start gap-3">
                <span className="num grid size-10 shrink-0 place-items-center border-2 border-black bg-carta text-sm text-nero">
                  {p.n}
                </span>
                <span>
                  <b className="display block text-xl tracking-wide">{p.t}</b>
                  <span className="text-sm muted">{p.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <section className="panel-vivo space-y-4 p-5 sm:p-7">
          <div>
            <h2 className="text-3xl">{it.home.titolo}</h2>
            <p className="text-sm font-bold muted">{it.home.creaSotto}</p>
          </div>
          <input
            aria-label={it.home.tuoNome}
            placeholder={it.home.tuoNome}
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium muted">
            <input
              type="checkbox"
              className="size-5"
              checked={streamer}
              onChange={(e) => setStreamer(e.target.checked)}
            />
            {it.home.stanzaStreamer}
          </label>
          {streamer && (
            <input
              aria-label={it.home.canale}
              placeholder={it.home.canale}
              className="field w-full"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              className="btn btn-primary w-full text-lg"
              disabled={!name.trim() || (streamer && !channel.trim())}
              onClick={() => void create()}
            >
              {it.home.creaStanza}
            </button>
            <button
              className="btn w-full text-base"
              disabled={!name.trim() || (streamer && !channel.trim())}
              onClick={() => void create("quiz")}
              data-testid="crea-quiz"
            >
              <Icon name="music" className="size-[1.2em]" /> {it.home.creaQuiz}
            </button>
          </div>
          {!name.trim() && <p className="text-xs font-bold muted">{it.home.scriviNome}</p>}
          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] muted">
            <span className="h-px flex-1 bg-[var(--line-forte)]" />
            {it.home.oppure}
            <span className="h-px flex-1 bg-[var(--line-forte)]" />
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              aria-label={it.home.codice}
              placeholder={it.home.codice}
              maxLength={5}
              className="field num min-w-[10rem] flex-1 text-center uppercase tracking-[0.3em] placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn flex-1" disabled={code.trim().length < 5} onClick={join}>
              {it.home.entraCodice}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="border-2 border-rose-400 bg-rose-400/10 p-2 text-sm font-bold text-rose-300"
            >
              {error}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
