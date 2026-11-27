"use client";

import Icon from "@/components/Icon";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import PackArt from "@/components/negozio/PackArt";
import PackOpening from "@/components/negozio/PackOpening";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { AperturaOut, NegozioOut } from "@/lib/negozio";
import { useProfile } from "@/lib/profile";

const COLORI: Record<string, string> = {
  base: "#8aa0ff",
  argento: "#cfd8e6",
  oro: "#ffd45a",
  leggendario: "#ff3d81",
};
const RARITA_COL: Record<string, string> = {
  comune: "#9aa7c7",
  rara: "#4aa8ff",
  epica: "#b36bff",
  leggendaria: "#ffc23d",
};
const NOMI_RARITA = it.album.rarita as Record<string, string>;

export default function NegozioView() {
  const { profile, loading, reload } = useProfile();
  const [negozio, setNegozio] = useState<NegozioOut | null>(null);
  const [apertura, setApertura] = useState<AperturaOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [pity, setPity] = useState<number | null>(null);

  useEffect(() => {
    api<NegozioOut>("/api/pacchetti")
      .then(setNegozio)
      .catch((e: Error) => setErrore(e.message));
  }, []);
  useEffect(() => {
    if (profile) setPity(profile.pity);
  }, [profile]);

  const apri = async (tipo: string) => {
    if (!profile || busy) return;
    setBusy(true);
    setErrore(null);
    try {
      const a = await api<AperturaOut>(`/api/pacchetti/${profile.id}/apri`, {
        method: "POST",
        body: JSON.stringify({ tipo }),
      });
      setApertura(a);
      setPity(a.pity);
      void reload();
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !negozio) return <main className="p-6">{errore ?? it.stanza.connessione}</main>;
  if (!profile)
    return (
      <main className="mx-auto max-w-md p-6 pt-14 text-center">
        <p className="panel p-6">{it.negozio.senzaProfilo}</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 pt-6" data-testid="negozio">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="eyebrow">{fmt(it.nav.ciao, { nome: profile.name })}</span>
          <h1 className="display text-5xl font-black">{it.negozio.titolo}</h1>
          <p className="max-w-xl text-[0.95rem] muted">{it.negozio.intro}</p>
        </div>
        <div className="panel flex items-center gap-4 px-5 py-3">
          <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950 shadow-[0_0_24px_rgb(255_200_60/0.5)]">
            <Icon name="coin" className="size-7" />
          </span>
          <div>
            <div className="display text-4xl font-black leading-none" data-testid="saldo">
              {fmt(it.negozio.crediti, { n: profile.crediti })}
            </div>
            {pity !== null && (
              <div className="mt-1.5 space-y-1">
                <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-pink-500"
                    style={{ width: `${Math.min(100, (pity / negozio.pity_max) * 100)}%` }}
                  />
                </div>
                <p className="text-[0.7rem] muted">
                  {fmt(it.negozio.pity, { n: negozio.pity_max, m: negozio.pity_max - pity })}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {errore && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/20 p-2 text-center text-sm font-bold text-rose-200"
        >
          {errore}
        </p>
      )}

      <ul className="grid gap-x-5 gap-y-8 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        {negozio.tipi.map((t) => {
          const manca = t.prezzo - profile.crediti;
          return (
            <li
              key={t.id}
              className="group relative flex flex-col items-center"
              data-testid={`pacchetto-${t.id}`}
            >
              {/* riflettore e piedistallo */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[22rem] rounded-full opacity-60 transition-opacity group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at 50% 42%, ${COLORI[t.id]}55, transparent 68%)`,
                }}
              />
              <div className="pack-vetrina relative w-[84%] max-w-[230px] will-change-transform">
                <PackArt tipo={t.id} nome={t.nome} carte={t.carte} className="w-full" />
              </div>
              <span
                aria-hidden="true"
                className="relative -mt-1 h-4 w-[70%] rounded-[50%] bg-black/70 blur-md"
              />
              <div className="panel relative mt-3 flex w-full flex-1 flex-col gap-3 p-4">
                <p className="text-center text-[0.95rem] font-semibold">
                  {fmt(it.negozio.carte, { n: t.carte })}
                  <span className="muted"> · </span>
                  <span style={{ color: COLORI[t.id] }}>
                    {t.garantita
                      ? fmt(it.negozio.garantita, {
                          r: (NOMI_RARITA[t.garantita] ?? "").toLowerCase(),
                        })
                      : it.negozio.nessunaGaranzia}
                  </span>
                </p>
                <div className="space-y-1.5">
                  <div className="eyebrow">{it.negozio.probabilita}</div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-black/40">
                    {Object.entries(t.probabilita).map(([r, p]) => (
                      <span key={r} style={{ width: `${p}%`, background: RARITA_COL[r] }} />
                    ))}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    {Object.entries(t.probabilita).map(([r, p]) => (
                      <li key={r} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <i
                            className="size-2 rounded-full"
                            style={{ background: RARITA_COL[r] }}
                          />
                          {NOMI_RARITA[r]}
                        </span>
                        <b>{p}%</b>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="btn btn-primary mt-auto w-full text-base"
                  disabled={busy || manca > 0}
                  onClick={() => void apri(t.id)}
                  data-testid={`apri-${t.id}`}
                >
                  {manca > 0 ? (
                    <Icon name="lock" className="size-[1.1em]" />
                  ) : (
                    <Icon name="coin" className="size-[1.2em]" />
                  )}
                  {manca > 0
                    ? fmt(it.negozio.mancano, { n: manca })
                    : `${it.negozio.apri} · ${fmt(it.negozio.prezzo, { n: t.prezzo })}`}
                </button>
                {manca > 0 && (
                  <p className="text-center text-xs muted">
                    {fmt(it.negozio.prezzo, { n: t.prezzo })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {apertura && (
          <PackOpening
            key={apertura.carte.map((c) => c.carta.id).join("-")}
            apertura={apertura}
            nome={negozio.tipi.find((t) => t.id === apertura.tipo)?.nome ?? ""}
            onChiudi={() => setApertura(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
