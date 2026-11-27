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

function Fan({ heroes, compact }: { heroes: Hero[]; compact?: boolean }) {
  const roles = ["Danno", "Capitano", "Supporto"];
  const pos = [
    "left-0 top-[14%] -rotate-[10deg]",
    "left-1/2 top-0 -translate-x-1/2 z-10",
    "right-0 top-[12%] rotate-[9deg]",
  ];
  const stage = (
    <div className="relative h-[470px] w-[500px]" aria-hidden="true">
      <div className="absolute inset-x-[8%] top-[12%] h-[70%] rounded-full bg-fuchsia-600/35 blur-3xl" />
      <div className="absolute inset-x-[22%] top-[34%] h-[46%] rounded-full bg-cyan-400/20 blur-3xl" />
      {heroes.map((h, i) => (
        <div key={h.nome} className={`absolute ${pos[i]}`}>
          <div className="float" style={{ ["--i" as string]: i }}>
            <CharacterCard character={h} role={roles[i]} />
          </div>
        </div>
      ))}
    </div>
  );
  if (!compact) return <div className="mx-auto w-[500px] max-w-full">{stage}</div>;
  // Su mobile: stesso palco, ridotto con una scala per non schiacciare il testo delle carte.
  return (
    <div className="relative mx-auto h-[255px] w-[310px]" aria-hidden="true">
      <div className="absolute left-0 top-0 origin-top-left scale-[0.62]">{stage}</div>
    </div>
  );
}

function ModeCard({
  href,
  icon,
  title,
  text,
  accent,
}: {
  href: string;
  icon: string;
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="panel panel-hover group relative flex items-center gap-4 overflow-hidden p-5"
    >
      <span
        className="absolute -right-10 -top-10 size-36 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
        style={{ background: accent }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 right-10 opacity-[0.08] transition-opacity group-hover:opacity-[0.16]"
        style={{ color: accent }}
      >
        <Icon name={icon} className="size-28" />
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <span
        className="relative grid size-16 shrink-0 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-white/30"
        style={{
          background: `linear-gradient(135deg, ${accent}, rgb(0 0 0 / 0.45))`,
          boxShadow: `0 8px 24px ${accent}66, inset 0 1px 0 rgb(255 255 255 / 0.4)`,
        }}
      >
        <Icon name={icon} className="size-8" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="display block text-2xl font-extrabold leading-none">{title}</span>
        <span className="mt-1.5 block text-[0.95rem] leading-snug muted">{text}</span>
      </span>
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition-all group-hover:translate-x-1 group-hover:bg-white/20">
        →
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
    <main className="mx-auto max-w-7xl px-5 pb-6 pt-8 sm:pt-14">
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 space-y-7">
          <header className="space-y-4">
            <span className="eyebrow reveal" style={{ ["--i" as string]: 0 }}>
              {it.home.eyebrow}
            </span>
            <h1
              className="reveal text-[4.4rem] font-black leading-[0.86] sm:text-[7rem]"
              style={{ ["--i" as string]: 1 }}
            >
              <span className="text-grad">{APP_NAME}</span>
            </h1>
            <p
              className="reveal max-w-md text-lg leading-relaxed muted"
              style={{ ["--i" as string]: 2 }}
            >
              {it.home.sottotitolo}
            </p>
          </header>

          <div className="lg:hidden">
            <Fan heroes={heroes} compact />
          </div>

          <div className="reveal flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
            <Link
              href="/duello"
              className="btn btn-primary px-6 text-base"
              data-testid="cta-duello"
            >
              <Icon name="swords" className="size-[1.2em]" /> {it.home.ctaDuello}
            </Link>
            <Link href="/ranked" className="btn px-5 text-base">
              <Icon name="crown" className="size-[1.2em]" /> {it.home.ctaRanked}
            </Link>
            <Link href="/negozio" className="btn px-5 text-base">
              <Icon name="cards" className="size-[1.2em]" /> {it.home.ctaNegozio}
            </Link>
            <a href="#amici" className="btn px-5 text-base" data-testid="cta-quiz-amici">
              <Icon name="music" className="size-[1.2em]" /> {it.home.ctaQuizAmici}
            </a>
          </div>
        </div>

        <div className="hidden lg:block">
          <Fan heroes={heroes} />
        </div>
      </section>

      <section className="mt-16 space-y-4">
        <h2 className="eyebrow">{it.home.modalita}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ModeCard
            href="/duello"
            icon="swords"
            title={it.home.duelloTitolo}
            text={it.home.duelloTesto}
            accent="#ff3d81"
          />
          <ModeCard
            href="/ranked"
            icon="crown"
            title={it.home.rankedTitolo}
            text={it.home.rankedTesto}
            accent="#7a5cff"
          />
          <ModeCard
            href="/veloce"
            icon="bolt"
            title={it.home.veloceTitolo}
            text={it.home.veloceTesto}
            accent="#ff8a3d"
          />
          <ModeCard
            href="/scala"
            icon="ladder"
            title={it.home.scalaTitolo}
            text={it.home.scalaTesto}
            accent="#35e0ff"
          />
          <ModeCard
            href="/duello/giorno"
            icon="trophy"
            title={it.home.sfidaTitolo}
            text={it.home.sfidaTesto}
            accent="#ffd45a"
          />
          <ModeCard
            href="/album"
            icon="cards"
            title={it.home.albumTitolo}
            text={it.home.albumTesto}
            accent="#3ddc97"
          />
        </div>
      </section>

      <section className="mt-16 grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]" id="amici">
        <div className="space-y-3">
          <h2 className="eyebrow">{it.home.amiciEyebrow}</h2>
          <p className="display text-4xl font-black leading-none sm:text-5xl">
            {it.home.amiciTitolo}
          </p>
          <p className="max-w-md muted">{it.home.amiciTesto}</p>
        </div>
        <section className="panel space-y-3.5 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-extrabold">{it.home.titolo}</h2>
            <p className="text-xs muted">{it.home.creaSotto}</p>
          </div>
          <input
            aria-label={it.home.tuoNome}
            placeholder={it.home.tuoNome}
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm muted">
            <input
              type="checkbox"
              className="size-4 accent-pink-500"
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
          <button
            className="btn btn-primary w-full text-lg"
            disabled={!name.trim() || (streamer && !channel.trim())}
            onClick={() => void create()}
          >
            {it.home.creaStanza}
          </button>
          {!name.trim() && <p className="-mt-2 text-xs muted">{it.home.scriviNome}</p>}
          <button
            className="btn w-full text-lg"
            disabled={!name.trim() || (streamer && !channel.trim())}
            onClick={() => void create("quiz")}
            data-testid="crea-quiz"
          >
            <Icon name="music" className="size-[1.2em]" /> {it.home.creaQuiz}
          </button>
          <div className="flex flex-wrap gap-2 pt-1">
            <input
              aria-label={it.home.codice}
              placeholder={it.home.codice}
              maxLength={5}
              className="field min-w-[10rem] flex-1 text-center uppercase tracking-[0.3em] placeholder:tracking-normal"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn flex-1" disabled={code.trim().length < 5} onClick={join}>
              {it.home.entraCodice}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-rose-400">
              {error}
            </p>
          )}
        </section>
      </section>

      <section className="mt-20 space-y-6">
        <div>
          <h2 className="eyebrow">{it.home.comeTitolo}</h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {it.home.passi.map((p, i) => (
            <li
              key={p.n}
              className="panel reveal relative overflow-hidden p-6"
              style={{ ["--i" as string]: i }}
            >
              <span className="display text-grad pointer-events-none absolute -right-2 -top-4 text-[6.5rem] font-black leading-none opacity-30">
                {p.n}
              </span>
              <h3 className="relative text-3xl font-extrabold">{p.t}</h3>
              <p className="relative mt-2 text-sm leading-relaxed muted">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {it.home.caratteristiche.map((c) => (
          <div key={c.t} className="rounded-2xl border bg-white/[0.03] p-4">
            <div className="display text-xl font-extrabold text-gold">{c.t}</div>
            <p className="mt-1 text-sm leading-snug muted">{c.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
