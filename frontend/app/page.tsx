"use client";

import Icon from "@/components/Icon";
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

/** La vignetta d'apertura: tre carte in posa su un fondo di linee cinetiche, un'onomatopea e un balloon. */
function Tavola({ heroes }: { heroes: Hero[] }) {
  const roles = ["Danno", "Capitano", "Supporto"];
  const pos = [
    "left-[3%] top-[20%] w-[36%] -rotate-[9deg]",
    "left-1/2 top-[5%] z-10 w-[42%] -translate-x-1/2",
    "right-[3%] top-[18%] w-[36%] rotate-[8deg]",
  ];
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-[34rem]" aria-hidden="true">
      <div className="absolute inset-[4%_2%_6%_2%] rotate-[1.5deg] overflow-hidden border-[3px] border-carta bg-black shadow-[10px_10px_0_var(--rosso)]">
        <i
          className="cinetiche absolute inset-0"
          style={{ ["--tinta" as string]: "#ff5a45", ["--cy" as string]: "42%" }}
        />
        <i
          className="retino absolute inset-x-0 bottom-0 h-2/5 opacity-70"
          style={{
            WebkitMaskImage: "linear-gradient(to top, #000, transparent)",
            maskImage: "linear-gradient(to top, #000, transparent)",
          }}
        />
      </div>
      {heroes.map((h, i) => (
        <div key={h.nome} className={`absolute ${pos[i]}`}>
          <div className="float" style={{ ["--i" as string]: i }}>
            <CharacterCard character={h} role={roles[i]} fluid />
          </div>
        </div>
      ))}
      <span className="onoma colpo absolute -left-1 top-0 z-20 text-[clamp(2.6rem,9vw,4.6rem)]">
        {it.home.grido}
      </span>
      <span
        className="balloon reveal absolute bottom-[1%] right-0 z-20 text-sm sm:text-base"
        style={{ ["--i" as string]: 5 }}
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
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className={`panel-hover group relative isolate flex min-h-[9.5rem] flex-col overflow-hidden p-5 ${grande ? "md:p-7" : ""} ${className}`}
      style={{ ["--accent" as string]: accent }}
    >
      <i
        aria-hidden="true"
        className="retino absolute inset-y-0 right-0 -z-10 w-3/5 opacity-40 transition-opacity group-hover:opacity-80"
        style={{
          WebkitMaskImage: "linear-gradient(250deg, #000, transparent 75%)",
          maskImage: "linear-gradient(250deg, #000, transparent 75%)",
        }}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-3 -right-2 -z-10 -rotate-12 opacity-25 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110 ${grande ? "md:opacity-40" : ""}`}
        style={{ color: accent }}
      >
        <Icon name={icon} className={grande ? "size-40 md:size-64" : "size-28"} />
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
        className={`mt-2 block max-w-md font-medium leading-snug muted ${grande ? "text-base md:text-lg" : "text-[0.95rem]"}`}
      >
        {text}
      </span>
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
              className="reveal text-grad text-[clamp(4.6rem,21vw,10.5rem)] leading-[0.84] tracking-normal lg:text-[clamp(6rem,11.5vw,11rem)]"
              style={{ ["--i" as string]: 1 }}
            >
              {APP_NAME}
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

          <div className="reveal flex flex-wrap gap-2.5" style={{ ["--i" as string]: 4 }}>
            <Link href="/ranked" className="btn text-base">
              <Icon name="crown" className="size-[1.1em]" /> {it.home.ctaRanked}
            </Link>
            <Link href="/negozio" className="btn text-base">
              <Icon name="cards" className="size-[1.1em]" /> {it.home.ctaNegozio}
            </Link>
            <a href="#amici" className="btn text-base" data-testid="cta-quiz-amici">
              <Icon name="music" className="size-[1.1em]" /> {it.home.ctaQuizAmici}
            </a>
          </div>
        </div>

        <Tavola heroes={heroes} />
      </section>

      <section className="mt-16 space-y-5 sm:mt-24">
        <div>
          <span className="eyebrow">{it.home.modalita}</span>
          <h2 className="mt-1 text-4xl leading-none sm:text-5xl">{it.home.modalitaTitolo}</h2>
        </div>
        {/* impaginata come una tavola: una vignetta grande e le altre attorno */}
        <div className="grid gap-5 md:grid-cols-6">
          <Vignetta
            href="/duello"
            icon="swords"
            n="01"
            title={it.home.duelloTitolo}
            text={it.home.duelloTesto}
            accent="#ff5a45"
            grande
            className="md:col-span-4 md:row-span-2"
          />
          <Vignetta
            href="/ranked"
            icon="crown"
            n="02"
            title={it.home.rankedTitolo}
            text={it.home.rankedTesto}
            accent="#9a86ff"
            className="md:col-span-2"
          />
          <Vignetta
            href="/sfide"
            icon="sparkles"
            n="03"
            title={it.home.sfideTitolo}
            text={it.home.sfideTesto}
            accent="#3fd0f0"
            className="md:col-span-2"
          />
          <Vignetta
            href="/scala"
            icon="ladder"
            n="04"
            title={it.home.scalaTitolo}
            text={it.home.scalaTesto}
            accent="#ff5fa8"
            className="md:col-span-2"
          />
          <Vignetta
            href="/veloce"
            icon="bolt"
            n="05"
            title={it.home.veloceTitolo}
            text={it.home.veloceTesto}
            accent="#ff9238"
            className="md:col-span-2"
          />
          <Vignetta
            href="/duello/giorno"
            icon="trophy"
            n="06"
            title={it.home.sfidaTitolo}
            text={it.home.sfidaTesto}
            accent="#ffd21f"
            className="md:col-span-2"
          />
          <Vignetta
            href="/album"
            icon="cards"
            n="07"
            title={it.home.albumTitolo}
            text={it.home.albumTesto}
            accent="#35d68a"
            cta={it.home.apri}
            className="md:col-span-3"
          />
          <Vignetta
            href="/negozio"
            icon="coin"
            n="08"
            title={it.home.negozioTitolo}
            text={it.home.negozioTesto}
            accent="#ffd21f"
            cta={it.home.apri}
            className="md:col-span-3"
          />
        </div>
      </section>

      <section
        className="mt-16 grid scroll-mt-20 items-start gap-8 sm:mt-24 lg:grid-cols-[1fr_1.1fr]"
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

      <section className="mt-16 sm:mt-24">
        <h2 className="sr-only">{it.home.numeriTitolo}</h2>
        <ul className="grid border-2 border-carta bg-carta text-nero sm:grid-cols-2 lg:grid-cols-4">
          {it.home.caratteristiche.map((c) => (
            <li
              key={c.t}
              className="su-carta border-black/80 p-5 max-lg:border-b-2 lg:border-r-2 lg:last:border-r-0"
            >
              <div className="display text-2xl leading-none">{c.t}</div>
              <p className="mt-1.5 text-sm font-medium leading-snug muted">{c.d}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
