"use client";

import Caricamento from "@/components/Caricamento";
import Icon from "@/components/Icon";
import Moneta from "@/components/Moneta";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import PackArt from "@/components/negozio/PackArt";
import PackOpening from "@/components/negozio/PackOpening";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { AperturaOut, NegozioOut } from "@/lib/negozio";
import { useProfile } from "@/lib/profile";

const COLORI: Record<string, string> = {
  base: "#f3ecdd",
  argento: "#8fe4f7",
  oro: "#ffd21f",
  leggendario: "#ff5a45",
};
const RARITA_COL: Record<string, string> = {
  comune: "#8f8c96",
  rara: "#58d6f5",
  epica: "#ff7cc4",
  leggendaria: "#ffd21f",
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

  if (loading || !negozio)
    return <Caricamento titolo={it.seo.negozio.h1} testo={errore ?? undefined} />;
  if (!profile)
    return (
      <main className="mx-auto max-w-md p-6 pt-14 text-center">
        <div className="vuoto">
          <Moneta grande className="size-14" />
          <p className="font-bold text-carta">{it.negozio.senzaProfilo}</p>
          <Link href="/profilo" className="btn btn-primary">
            {it.nav.profilo}
          </Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="negozio">
      <header className="testata flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="eyebrow">{fmt(it.nav.ciao, { nome: profile.name })}</span>
          <h1 className="text-4xl sm:text-5xl">{it.negozio.titolo}</h1>
          <p className="max-w-xl text-[0.95rem] font-medium muted">{it.negozio.intro}</p>
        </div>
        <div className="saldo">
          <Moneta grande gira className="size-16 shrink-0" key={profile.crediti} />
          <div>
            <div className="num text-3xl leading-none" data-testid="saldo">
              {fmt(it.negozio.crediti, { n: profile.crediti })}
            </div>
            {pity !== null && (
              <div className="mt-1.5 space-y-1">
                <div className="h-2 w-48 max-w-full border-[1.5px] border-black bg-black/15">
                  <div
                    className="h-full bg-[#e0301f]"
                    style={{ width: `${Math.min(100, (pity / negozio.pity_max) * 100)}%` }}
                  />
                </div>
                <p className="text-[0.72rem] font-bold muted">
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
          className="border-2 border-rose-400 bg-rose-400/10 p-2 text-center text-sm font-bold text-rose-300"
        >
          {errore}
        </p>
      )}

      <ul className="grid gap-x-5 gap-y-7 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        {negozio.tipi.map((t) => {
          const manca = t.prezzo - profile.crediti;
          return (
            <li
              key={t.id}
              className="panel gruppo-busta group relative isolate flex flex-col items-center overflow-hidden px-4 pb-5 pt-6"
              style={{ ["--accent" as string]: COLORI[t.id] }}
              data-testid={`pacchetto-${t.id}`}
            >
              {/* fondo a retino nella tinta della bustina */}
              <span
                aria-hidden="true"
                className="retino absolute inset-x-0 top-0 -z-10 h-72 opacity-30 transition-opacity group-hover:opacity-70"
                style={{
                  WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, #000, transparent 70%)",
                  maskImage: "radial-gradient(ellipse at 50% 45%, #000, transparent 70%)",
                }}
              />
              <div className="pack-vetrina relative w-[62%] max-w-[210px] drop-shadow-[6px_6px_0_#000] sm:w-[78%]">
                <PackArt tipo={t.id} nome={t.nome} carte={t.carte} className="w-full" />
              </div>
              <div className="relative mt-3 flex w-full flex-1 flex-col gap-3">
                <p className="text-center text-[0.95rem] font-bold">
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
                  <div className="flex h-3 overflow-hidden border-[1.5px] border-black bg-black">
                    {Object.entries(t.probabilita).map(([r, p]) => (
                      <span key={r} style={{ width: `${p}%`, background: RARITA_COL[r] }} />
                    ))}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    {Object.entries(t.probabilita).map(([r, p]) => (
                      <li key={r} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <i className="size-2 rotate-45" style={{ background: RARITA_COL[r] }} />
                          {NOMI_RARITA[r]}
                        </span>
                        <b>{p}%</b>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="btn btn-primary mt-auto min-h-12 w-full text-lg"
                  disabled={busy || manca > 0}
                  onClick={() => void apri(t.id)}
                  data-testid={`apri-${t.id}`}
                >
                  {manca > 0 ? (
                    <Icon name="lock" className="size-[1.1em]" />
                  ) : (
                    <Moneta className="size-[1.3em]" />
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
