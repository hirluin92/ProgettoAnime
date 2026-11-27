"use client";

import Caricamento from "@/components/Caricamento";
import Icon, { Medaglia } from "@/components/Icon";
import Moneta from "@/components/Moneta";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import LegaEmblema from "@/components/ranked/LegaEmblema";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import { COLORI_LEGA, nomeLega, progressoGradino, type RankedStato } from "@/lib/ranked";

export default function RankedHome() {
  const { profile, loading, reload } = useProfile();
  const [st, setSt] = useState<RankedStato | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    if (!profile) return;
    setSt(await api<RankedStato>(`/api/ranked/${profile.id}`));
  }, [profile]);
  useEffect(() => {
    carica().catch((e: Error) => setErrore(e.message));
  }, [carica]);

  const ritira = async (partite: number) => {
    if (!profile) return;
    try {
      await api(`/api/ranked/${profile.id}/ritira`, {
        method: "POST",
        body: JSON.stringify({ partite }),
      });
      await carica();
      void reload();
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  if (loading) return <Caricamento />;
  if (!profile)
    return (
      <main className="mx-auto max-w-md p-6 pt-14 text-center">
        <div className="vuoto">
          <LegaEmblema lega="Bronzo" divisione={null} ignota className="w-24" />
          <p className="font-bold text-carta">{it.ranked.senzaProfilo}</p>
          <Link href="/profilo" className="btn btn-primary">
            {it.ranked.vaiProfilo}
          </Link>
        </div>
      </main>
    );
  if (!st) return <Caricamento testo={errore ?? undefined} />;

  const colore = COLORI_LEGA[st.lega];
  const campione = st.divisione === null;
  const pr = progressoGradino(st.mmr);
  const leghe = Object.keys(COLORI_LEGA);
  return (
    <main
      className="mx-auto max-w-7xl space-y-6 p-4 pt-6"
      data-testid="ranked"
      style={{ ["--accent" as string]: st.in_piazzamento ? "var(--viola)" : colore }}
    >
      <header className="testata space-y-1">
        <span className="eyebrow">{fmt(it.nav.ciao, { nome: profile.name })}</span>
        <h1 className="text-4xl sm:text-5xl">{it.ranked.titolo}</h1>
        <p className="max-w-2xl text-[0.95rem] font-medium muted">{it.ranked.intro}</p>
      </header>

      <section className="panel-vivo relative isolate grid items-center gap-5 overflow-hidden p-5 sm:grid-cols-[auto_1fr_auto] sm:gap-8 sm:p-7">
        <i
          aria-hidden="true"
          className="cinetiche absolute inset-0 -z-10 opacity-60"
          style={{ ["--tinta" as string]: "var(--accent)", ["--cx" as string]: "12%" }}
        />
        <LegaEmblema
          lega={st.lega}
          divisione={st.divisione}
          ignota={st.in_piazzamento}
          className="mx-auto w-36 shrink-0 sm:w-44"
        />
        <div className="min-w-0 space-y-2 text-center sm:text-left">
          <div className="display text-5xl italic leading-none sm:text-6xl" data-testid="ranked-lega">
            {st.in_piazzamento ? it.ranked.titolo : nomeLega(st.lega, st.divisione)}
          </div>
          <p className="num text-lg text-[var(--accent)]">{fmt(it.ranked.mmr, { n: st.mmr })}</p>
          {st.in_piazzamento ? (
            <p className="text-sm font-bold text-amber-200" data-testid="ranked-piazzamento">
              {fmt(it.ranked.piazzamento, { n: st.piazzamento_rimaste })}
            </p>
          ) : campione ? (
            <p className="text-sm font-bold text-amber-200">{it.ranked.ultimaLega}</p>
          ) : (
            <>
              <div className="barra">
                <i style={{ width: `${(pr / 50) * 100}%` }} />
              </div>
              <p className="text-xs font-bold muted">{fmt(it.ranked.alProssimo, { n: 50 - pr })}</p>
            </>
          )}
        </div>
        <div className="w-full sm:w-auto">
          {st.serve_account ? (
            <div className="balloon max-w-xs space-y-3 text-center">
              <p className="text-sm">{it.ranked.serveAccount}</p>
              <Link href="/profilo" className="btn btn-primary w-full">
                {it.ranked.vaiProfilo}
              </Link>
            </div>
          ) : (
            <Link
              href="/ranked/gioca"
              className="btn btn-primary min-h-16 w-full px-8 text-2xl"
              data-testid="gioca-ranked"
            >
              <Icon name="swords" /> {it.ranked.gioca}
            </Link>
          )}
        </div>
      </section>

      {/* la scalata: sei stemmi su un binario, quello attuale in evidenza */}
      <section className="panel overflow-x-auto p-4 sm:p-5" aria-label="Le leghe">
        <ol className="relative flex min-w-[30rem] items-end justify-between gap-2">
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-[2.1rem] h-1 bg-[var(--line-forte)]"
          />
          {leghe.map((l) => {
            const qui = l === st.lega && !st.in_piazzamento;
            const passata =
              !st.in_piazzamento && leghe.indexOf(l) < leghe.indexOf(st.lega);
            return (
              <li
                key={l}
                className={`relative flex-1 text-center ${qui || passata ? "" : "opacity-45"}`}
                aria-current={qui ? "step" : undefined}
              >
                <LegaEmblema
                  lega={l}
                  divisione={null}
                  className={`mx-auto transition-transform ${qui ? "w-20 -translate-y-1 sm:w-28" : "w-14 sm:w-20"}`}
                />
                <div
                  className={`display mt-1 inline-block px-2 text-base tracking-wide ${qui ? "bg-carta text-nero" : ""}`}
                  style={qui ? undefined : { color: COLORI_LEGA[l] }}
                >
                  {l}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {errore && (
        <p role="alert" className="border-2 border-rose-400 bg-rose-400/10 p-2 text-center font-bold text-rose-300">
          {errore}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="panel space-y-3 p-5" data-testid="ranked-settimana">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-3xl">{it.ranked.settimana}</h2>
            <p className="text-sm font-bold muted">
              {fmt(it.ranked.partiteSett, { n: st.partite_settimana })}
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {st.soglie.map((s) => (
              <li
                key={s.partite}
                className={`space-y-2 border-2 p-3 text-center ${
                  s.ritirata
                    ? "border-[#35d68a] bg-[#35d68a]/10"
                    : s.raggiunta
                      ? "border-[#ffd21f] bg-[#ffd21f]/10"
                      : "border-[var(--line-forte)] bg-black/20"
                }`}
              >
                <div className="num text-2xl">
                  {Math.min(st.partite_settimana, s.partite)}/{s.partite}
                </div>
                <div className="barra" style={{ ["--accent" as string]: "var(--giallo)" }}>
                  <i
                    style={{
                      width: `${(Math.min(st.partite_settimana, s.partite) / s.partite) * 100}%`,
                    }}
                  />
                </div>
                <div className="chip border-black bg-[#ffd21f] text-black">
                  <Moneta /> +{s.crediti}
                </div>
                {s.raggiunta && !s.ritirata ? (
                  <button
                    className="btn btn-primary w-full text-sm"
                    onClick={() => void ritira(s.partite)}
                    data-testid={`ritira-${s.partite}`}
                  >
                    {fmt(it.ranked.ritira, { n: s.crediti })}
                  </button>
                ) : (
                  <p
                    className={`text-sm font-bold ${s.ritirata ? "text-emerald-300" : "muted"}`}
                    data-testid={`ritira-${s.partite}`}
                  >
                    {s.ritirata
                      ? it.ranked.ritirato
                      : fmt(it.ranked.ancora, { n: s.partite - st.partite_settimana })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel space-y-2 p-5" data-testid="ranked-classifica">
          <h2 className="text-3xl">{it.ranked.classifica}</h2>
          {st.classifica.length === 0 ? (
            <p className="vuoto text-sm font-bold">{it.ranked.nessunoClass}</p>
          ) : (
            <ol className="text-sm">
              {st.classifica.map((r, i) => (
                <li
                  key={r.nome + i}
                  className="riga"
                  data-io={r.nome === profile.name ? "" : undefined}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Medaglia pos={i} />
                    <span className="truncate">{r.nome}</span>
                  </span>
                  <span className="shrink-0">
                    <b style={{ color: r.nome === profile.name ? undefined : COLORI_LEGA[r.lega] }}>
                      {nomeLega(r.lega, r.divisione)}
                    </b>{" "}
                    <span className="num text-xs opacity-70">{r.mmr}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
