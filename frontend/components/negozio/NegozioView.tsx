"use client";

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="eyebrow">{profile.name}</span>
          <h1 className="display text-4xl font-black">{it.negozio.titolo}</h1>
          <p className="max-w-xl text-sm muted">{it.negozio.intro}</p>
        </div>
        <div className="text-right">
          <div className="display text-grad text-4xl font-black" data-testid="saldo">
            {fmt(it.negozio.crediti, { n: profile.crediti })}
          </div>
          {pity !== null && (
            <p className="text-xs muted">
              {fmt(it.negozio.pity, { n: negozio.pity_max, m: negozio.pity_max - pity })}
            </p>
          )}
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

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {negozio.tipi.map((t) => (
          <li
            key={t.id}
            className="panel relative space-y-3 overflow-hidden p-4"
            data-testid={`pacchetto-${t.id}`}
          >
            <span
              aria-hidden="true"
              className="absolute -right-8 -top-8 size-32 rounded-full opacity-30 blur-2xl"
              style={{ background: COLORI[t.id] }}
            />
            <div className="pack-vetrina relative mx-auto w-[78%] max-w-[210px] will-change-transform">
              <PackArt tipo={t.id} nome={t.nome} carte={t.carte} className="w-full" />
            </div>
            <div className="relative">
              <h2 className="display text-2xl font-black" style={{ color: COLORI[t.id] }}>
                {t.nome}
              </h2>
              <p className="text-sm">
                {fmt(it.negozio.carte, { n: t.carte })} ·{" "}
                {t.garantita
                  ? fmt(it.negozio.garantita, { r: (NOMI_RARITA[t.garantita] ?? "").toLowerCase() })
                  : it.negozio.nessunaGaranzia}
              </p>
            </div>
            <div className="relative space-y-0.5 text-xs">
              <div className="eyebrow">{it.negozio.probabilita}</div>
              {Object.entries(t.probabilita).map(([r, p]) => (
                <div key={r} className="flex justify-between">
                  <span>{NOMI_RARITA[r]}</span>
                  <span className="font-bold">{p}%</span>
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary relative w-full"
              disabled={busy || profile.crediti < t.prezzo}
              onClick={() => void apri(t.id)}
              data-testid={`apri-${t.id}`}
            >
              {profile.crediti < t.prezzo
                ? `${fmt(it.negozio.prezzo, { n: t.prezzo })} · ${it.negozio.pocoCrediti}`
                : `${it.negozio.apri} · ${fmt(it.negozio.prezzo, { n: t.prezzo })}`}
            </button>
          </li>
        ))}
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
