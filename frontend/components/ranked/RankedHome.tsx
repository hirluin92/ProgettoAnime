"use client";

import Caricamento from "@/components/Caricamento";
import Icon from "@/components/Icon";
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
        <p className="panel p-6">{it.ranked.senzaProfilo}</p>
      </main>
    );
  if (!st) return <Caricamento testo={errore ?? undefined} />;

  const colore = COLORI_LEGA[st.lega];
  const campione = st.divisione === null;
  const pr = progressoGradino(st.mmr);
  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="ranked">
      <header className="testata space-y-1">
        <span className="eyebrow">{fmt(it.nav.ciao, { nome: profile.name })}</span>
        <h1 className="display text-4xl font-black">{it.ranked.titolo}</h1>
        <p className="max-w-2xl text-sm muted">{it.ranked.intro}</p>
      </header>

      <section className="panel flex flex-wrap items-center gap-6 p-5">
        <LegaEmblema
          lega={st.lega}
          divisione={st.divisione}
          ignota={st.in_piazzamento}
          className="w-32 shrink-0 drop-shadow-[0_10px_24px_rgb(0_0_0/0.6)]"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="display text-3xl font-black" data-testid="ranked-lega">
            {st.in_piazzamento ? it.ranked.titolo : nomeLega(st.lega, st.divisione)}
          </div>
          <p className="text-sm">{fmt(it.ranked.mmr, { n: st.mmr })}</p>
          {st.in_piazzamento ? (
            <p className="text-sm text-amber-200" data-testid="ranked-piazzamento">
              {fmt(it.ranked.piazzamento, { n: st.piazzamento_rimaste })}
            </p>
          ) : campione ? (
            <p className="text-sm text-amber-200">{it.ranked.ultimaLega}</p>
          ) : (
            <>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(pr / 50) * 100}%`, background: colore }}
                />
              </div>
              <p className="text-xs muted">{fmt(it.ranked.alProssimo, { n: 50 - pr })}</p>
            </>
          )}
        </div>
        <div className="w-full sm:w-auto">
          {st.serve_account ? (
            <div className="space-y-2 text-center">
              <p className="text-sm">{it.ranked.serveAccount}</p>
              <Link href="/profilo" className="btn btn-primary">
                {it.ranked.vaiProfilo}
              </Link>
            </div>
          ) : (
            <Link
              href="/ranked/gioca"
              className="btn btn-gold w-full text-lg"
              data-testid="gioca-ranked"
            >
              <Icon name="swords" /> {it.ranked.gioca}
            </Link>
          )}
        </div>
      </section>

      <section className="panel p-5" aria-label="Le leghe">
        <ul className="flex flex-wrap items-end justify-around gap-2">
          {Object.keys(COLORI_LEGA).map((l) => (
            <li
              key={l}
              className={`text-center transition-opacity ${l === st.lega && !st.in_piazzamento ? "opacity-100" : "opacity-45"}`}
            >
              <LegaEmblema lega={l} divisione={null} className="mx-auto w-16 sm:w-20" />
              <div className="display text-sm font-black" style={{ color: COLORI_LEGA[l] }}>
                {l}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {errore && (
        <p role="alert" className="text-center text-rose-300">
          {errore}
        </p>
      )}

      <section className="panel space-y-3 p-5" data-testid="ranked-settimana">
        <h2 className="text-2xl font-extrabold">{it.ranked.settimana}</h2>
        <p className="text-sm muted">{fmt(it.ranked.partiteSett, { n: st.partite_settimana })}</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {st.soglie.map((s) => (
            <li key={s.partite} className="rounded-2xl border bg-white/[0.04] p-3 text-center">
              <div className="display text-3xl font-black">
                {Math.min(st.partite_settimana, s.partite)}/{s.partite}
              </div>
              {s.raggiunta && !s.ritirata ? (
                <button
                  className="btn btn-primary mt-2 w-full text-sm"
                  onClick={() => void ritira(s.partite)}
                  data-testid={`ritira-${s.partite}`}
                >
                  {fmt(it.ranked.ritira, { n: s.crediti })}
                </button>
              ) : (
                <p
                  className={`mt-2 py-2 text-sm font-bold ${s.ritirata ? "text-emerald-300" : "muted"}`}
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
        <h2 className="text-2xl font-extrabold">{it.ranked.classifica}</h2>
        {st.classifica.length === 0 ? (
          <p className="text-sm muted">{it.ranked.nessunoClass}</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {st.classifica.map((r, i) => (
              <li key={r.nome + i} className="flex justify-between gap-3">
                <span>
                  {i + 1}. {r.nome}
                </span>
                <span>
                  <b style={{ color: COLORI_LEGA[r.lega] }}>{nomeLega(r.lega, r.divisione)}</b>{" "}
                  <span className="muted">({r.mmr})</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
