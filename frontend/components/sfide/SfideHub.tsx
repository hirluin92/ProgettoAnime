"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Emblema from "@/components/Emblema";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { fmt } from "@/components/duello/DuelloBoard";
import { useProfile } from "@/lib/profile";
import type { AnimedleStato, ZoomStato } from "@/lib/quiz";

/** Quanto manca alla mezzanotte italiana (quando cambiano le sfide), come «5h 12m». */
function manca(): string {
  const [h, m, s] = new Date()
    .toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour12: false })
    .split(":")
    .map(Number);
  const resto = 24 * 3600 - (h * 3600 + m * 60 + s);
  return `${Math.floor(resto / 3600)}h ${String(Math.floor((resto % 3600) / 60)).padStart(2, "0")}m`;
}

function Carta({
  href,
  icona,
  titolo,
  testo,
  accento,
  stato,
  testId,
  numero,
}: {
  href: string;
  icona: string;
  titolo: string;
  testo: string;
  accento: string;
  stato?: { testo: string; fatto: boolean; vinto?: boolean } | null;
  testId?: string;
  numero: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="panel-hover group relative isolate flex min-h-[12.5rem] flex-col gap-2 overflow-hidden p-5"
      style={{ ["--accent" as string]: accento }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-3 -z-10 transition-transform duration-300 group-hover:scale-105"
      >
        <Emblema nome={icona} tinta={accento} className="size-36" />
      </span>
      <div className="flex items-center justify-between gap-2">
        <span className="num text-sm" style={{ color: accento }}>
          {numero}
        </span>
        {stato ? (
          <span
            className={`chip ${
              stato.fatto
                ? stato.vinto === false
                  ? "border-black bg-[#e0301f] text-white"
                  : "border-black bg-[#35d68a] text-black"
                : "border-black bg-carta text-nero"
            }`}
            data-testid={testId ? `${testId}-stato` : undefined}
          >
            {stato.fatto && <Icon name={stato.vinto === false ? "x" : "check"} />}
            {stato.testo}
          </span>
        ) : (
          <span />
        )}
      </div>
      <h2 className="text-4xl leading-none sm:text-5xl">{titolo}</h2>
      <p className="max-w-[62%] text-[0.95rem] font-medium leading-snug muted">{testo}</p>
      <span
        className="display mt-auto flex items-center gap-2 pt-3 text-lg tracking-wider"
        style={{ color: accento }}
      >
        {stato?.fatto ? it.quiz.rivedi : it.quiz.gioca}
        <span
          aria-hidden="true"
          className="inline-block h-[3px] w-8 bg-current transition-all duration-200 group-hover:w-14"
        />
      </span>
    </Link>
  );
}

export default function SfidePage() {
  const { profile, loading } = useProfile();
  const [animedle, setAnimedle] = useState<AnimedleStato | null>(null);
  const [scorcio, setScorcio] = useState<ZoomStato | null>(null);
  const [personaggio, setPersonaggio] = useState<ZoomStato | null>(null);
  const [sigla, setSigla] = useState<ZoomStato | null>(null);

  useEffect(() => {
    if (loading) return;
    const q = profile ? `?profile_id=${profile.id}` : "";
    api<AnimedleStato>(`/api/quiz/animedle/stato${q}`)
      .then(setAnimedle)
      .catch(() => undefined);
    api<ZoomStato>(`/api/quiz/zoom/scorcio/stato${q}`)
      .then(setScorcio)
      .catch(() => undefined);
    api<ZoomStato>(`/api/quiz/zoom/personaggio/stato${q}`)
      .then(setPersonaggio)
      .catch(() => undefined);
    api<ZoomStato>(`/api/quiz/zoom/sigla/stato${q}`)
      .then(setSigla)
      .catch(() => undefined);
  }, [loading, profile]);

  const stato = (
    s: { finito: boolean; vinto: boolean; tentativi_fatti: number; tentativi_max: number } | null,
  ) =>
    s
      ? {
          fatto: s.finito,
          vinto: s.vinto,
          testo: s.finito
            ? s.vinto
              ? it.quiz.vinta
              : it.quiz.persa
            : s.tentativi_fatti > 0
              ? `${s.tentativi_fatti}/${s.tentativi_max}`
              : it.quiz.daFare,
        }
      : null;
  const statoAnimedle = stato(animedle);
  const [prossima, setProssima] = useState("");
  useEffect(() => {
    setProssima(manca());
    const t = setInterval(() => setProssima(manca()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 pt-8" data-testid="sfide">
      <header className="testata space-y-1">
        <span className="eyebrow">
          {profile ? fmt(it.nav.ciao, { nome: profile.name }) : it.quiz.delGiorno}
        </span>
        <h1 className="text-4xl sm:text-5xl">{it.quiz.titolo}</h1>
        <p className="max-w-2xl text-[0.95rem] font-medium muted">{it.quiz.intro}</p>
        {prossima && (
          <p
            className="chip mt-2 mr-2 border-black bg-carta text-nero"
            data-testid="sfide-prossima"
          >
            <Icon name="clock" />
            {fmt(it.quiz.prossima, { t: prossima })}
          </p>
        )}
        {animedle && animedle.serie > 0 && (
          <p className="chip mt-2">
            <Icon name="flame" className="size-4 text-orange-400" />
            {it.quiz.serie.replace("{n}", String(animedle.serie))}
          </p>
        )}
      </header>
      <div className="grid gap-5 md:grid-cols-2 md:[&>*:last-child]:col-span-2 lg:grid-cols-6 lg:[&>*:nth-child(-n+3)]:col-span-2 lg:[&>*:nth-child(n+4)]:col-span-3">
        <Carta
          href="/sfide/animedle"
          icona="sparkles"
          titolo={it.quiz.animedle.titolo}
          testo={it.quiz.animedleTesto}
          accento="#3fd0f0"
          stato={statoAnimedle}
          testId="sfida-animedle"
          numero="01"
        />
        <Carta
          href="/sfide/scorcio"
          icona="moon"
          titolo={it.quiz.scorcio.titolo}
          testo={it.quiz.scorcioTesto}
          accento="#ff5fa8"
          stato={stato(scorcio)}
          testId="sfida-scorcio"
          numero="02"
        />
        <Carta
          href="/sfide/personaggio"
          icona="shield"
          titolo={it.quiz.personaggio.titolo}
          testo={it.quiz.personaggioTesto}
          accento="#35d68a"
          stato={stato(personaggio)}
          testId="sfida-personaggio"
          numero="03"
        />
        <Carta
          href="/sfide/sigla"
          icona="music"
          titolo={it.quiz.sigla.titolo}
          testo={it.quiz.siglaTesto}
          accento="#ff9238"
          stato={stato(sigla)}
          testId="sfida-sigla"
          numero="04"
        />
        <Carta
          href="/duello/giorno"
          icona="trophy"
          titolo={it.quiz.rompicapo}
          testo={it.quiz.rompicapoTesto}
          accento="#ffd21f"
          testId="sfida-rompicapo"
          numero="05"
        />
      </div>
    </main>
  );
}
