"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
}: {
  href: string;
  icona: string;
  titolo: string;
  testo: string;
  accento: string;
  stato?: { testo: string; fatto: boolean; vinto?: boolean } | null;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="panel panel-hover group relative flex flex-col gap-3 overflow-hidden p-5"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accento}, transparent)` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 right-4 opacity-[0.08]"
        style={{ color: accento }}
      >
        <Icon name={icona} className="size-32" />
      </span>
      <span
        className="relative grid size-14 place-items-center rounded-2xl text-white ring-1 ring-white/30"
        style={{
          background: `linear-gradient(135deg, ${accento}, rgb(0 0 0 / 0.45))`,
          boxShadow: `0 8px 24px ${accento}66, inset 0 1px 0 rgb(255 255 255 / 0.4)`,
        }}
      >
        <Icon name={icona} className="size-7" />
      </span>
      <div className="relative space-y-1">
        <h2 className="display text-3xl font-black leading-none">{titolo}</h2>
        <p className="text-[0.95rem] leading-snug muted">{testo}</p>
      </div>
      <div className="relative mt-auto flex items-center justify-between pt-2">
        {stato ? (
          <span
            className={`chip ${
              stato.fatto
                ? stato.vinto === false
                  ? "text-rose-300"
                  : "text-emerald-300"
                : "text-amber-200"
            }`}
            data-testid={testId ? `${testId}-stato` : undefined}
          >
            {stato.testo}
          </span>
        ) : (
          <span />
        )}
        <span className="btn btn-primary min-h-10 px-4 text-sm">
          {stato?.fatto ? it.quiz.rivedi : it.quiz.gioca} →
        </span>
      </div>
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
        <h1 className="display text-5xl font-black">{it.quiz.titolo}</h1>
        <p className="max-w-2xl text-[0.95rem] muted">{it.quiz.intro}</p>
        {prossima && (
          <p className="chip mt-2 mr-2" data-testid="sfide-prossima">
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
          accento="#35e0ff"
          stato={statoAnimedle}
          testId="sfida-animedle"
        />
        <Carta
          href="/sfide/scorcio"
          icona="moon"
          titolo={it.quiz.scorcio.titolo}
          testo={it.quiz.scorcioTesto}
          accento="#ff6fb0"
          stato={stato(scorcio)}
          testId="sfida-scorcio"
        />
        <Carta
          href="/sfide/personaggio"
          icona="shield"
          titolo={it.quiz.personaggio.titolo}
          testo={it.quiz.personaggioTesto}
          accento="#3ddc97"
          stato={stato(personaggio)}
          testId="sfida-personaggio"
        />
        <Carta
          href="/sfide/sigla"
          icona="music"
          titolo={it.quiz.sigla.titolo}
          testo={it.quiz.siglaTesto}
          accento="#ff8a3d"
          stato={stato(sigla)}
          testId="sfida-sigla"
        />
        <Carta
          href="/duello/giorno"
          icona="trophy"
          titolo={it.quiz.rompicapo}
          testo={it.quiz.rompicapoTesto}
          accento="#ffd45a"
          testId="sfida-rompicapo"
        />
      </div>
    </main>
  );
}
