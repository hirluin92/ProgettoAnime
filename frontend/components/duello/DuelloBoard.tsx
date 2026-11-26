"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import it from "@/i18n/it.json";
import { ARCH_NOMI } from "@/lib/battle/labels";
import { costoIn, postiMax, type CartaView, type MossaIn, type StatoView } from "@/lib/duello";
import DuelloCard, { DuelloTile } from "./DuelloCard";

interface Mossa {
  carta: CartaView;
  corsia: number;
}

export const fmt = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** Plancia, mano e conferma: la stessa per la CPU, il rompicapo e i duelli in stanza. */
export default function DuelloBoard({
  stato,
  avversario,
  occupato,
  caption,
  onConferma,
  onSalta,
  attesa,
}: {
  stato: StatoView;
  avversario: string;
  occupato: boolean;
  caption: string | null;
  onConferma: (mosse: MossaIn[]) => void;
  onSalta?: () => void;
  attesa?: ReactNode; // es. timer del turno o «aspetto l'avversario»
}) {
  const [pending, setPending] = useState<Mossa[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [dettaglio, setDettaglio] = useState<CartaView | null>(null);
  useEffect(() => {
    setPending([]);
    setSel(null);
  }, [stato.turno]);

  const speso = pending.reduce((s, m) => s + costoIn(m.carta, stato.luoghi[m.corsia]), 0);
  const inMano = stato.mano.filter((c) => !pending.some((m) => m.carta.id === c.id));
  const selCarta = inMano.find((c) => c.id === sel) ?? null;
  const posti = (k: number) =>
    postiMax(stato.luoghi[k]) -
    stato.corsie[k][0].length -
    pending.filter((m) => m.corsia === k).length;

  const gioca = (k: number) => {
    if (!selCarta || occupato) return;
    const costo = costoIn(selCarta, stato.luoghi[k]);
    if (speso + costo > stato.energia || posti(k) <= 0) return;
    setPending([...pending, { carta: selCarta, corsia: k }]);
    setSel(null);
  };

  return (
    <div className="space-y-4" data-testid="duello-gioco">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="display text-3xl font-black" data-testid="duello-turno">
            {fmt(it.duello.turno, { n: Math.min(stato.turno, stato.turni), tot: stato.turni })}
          </h1>
        </div>
        <div className="text-right text-xs muted">
          <div>{fmt(it.duello.oppMano, { nome: avversario, n: stato.mano_cpu })}</div>
          <div>{fmt(it.duello.mazzoRimasto, { n: stato.mazzo })}</div>
        </div>
      </header>

      <div
        className="sticky top-14 z-30 -mx-1 grid grid-cols-3 gap-1.5 rounded-xl bg-[#05040c]/90 p-1.5 backdrop-blur md:hidden"
        data-testid="duello-striscia"
      >
        {stato.luoghi.map((l, k) => {
          const [tu, cpu] = stato.totali[k];
          return (
            <div
              key={l.id + k}
              className={`rounded-lg px-2 py-1 text-center text-xs ${
                tu > cpu ? "bg-emerald-500/15" : cpu > tu ? "bg-red-500/15" : "bg-white/5"
              }`}
            >
              <div className="truncate font-bold">{l.nome}</div>
              <div className="text-base font-black">
                <span className="text-emerald-300">{tu}</span>
                <span className="mx-1 muted">–</span>
                <span className="text-red-300">{cpu}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {stato.luoghi.map((l, k) => {
          const [tu, cpu] = stato.totali[k];
          const mie = stato.corsie[k][0];
          const loro = stato.corsie[k][1];
          const prossime = pending.filter((m) => m.corsia === k);
          const migliore = tu > cpu ? "tu" : cpu > tu ? "cpu" : "";
          return (
            <section
              key={l.id + k}
              className={`panel flex flex-col gap-1.5 p-1.5 ${migliore === "tu" ? "ring-1 ring-emerald-400/70" : migliore === "cpu" ? "ring-1 ring-red-400/70" : ""}`}
              data-testid={`corsia-${k}`}
            >
              <div className="text-center">
                <div className="display text-base font-extrabold leading-none">{l.nome}</div>
                <p className="mt-0.5 text-xs leading-tight muted">{l.regola}</p>
                {l.favorisce.length > 0 && (
                  <p className="text-xs text-amber-300">
                    {fmt(it.duello.favorisce, {
                      a: l.favorisce.map((a) => ARCH_NOMI[a] ?? a).join(", "),
                    })}
                  </p>
                )}
              </div>
              <div className="grid min-h-[56px] grid-cols-4 content-start gap-1.5 md:min-h-[92px]">
                {loro.map((i) => (
                  <DuelloTile
                    key={i.uid}
                    carta={i.carta}
                    potenza={i.potenza}
                    tinta="cpu"
                    onClick={() => setDettaglio(i.carta)}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/50 px-3 py-1.5 text-xl font-black">
                <span className="text-emerald-300" data-testid={`tot-tu-${k}`}>
                  {tu}
                </span>
                <span className="text-xs muted">vs</span>
                <span className="text-red-300" data-testid={`tot-cpu-${k}`}>
                  {cpu}
                </span>
              </div>
              <div className="grid min-h-[56px] grid-cols-4 content-start gap-1.5 md:min-h-[92px]">
                {mie.map((i) => (
                  <DuelloTile
                    key={i.uid}
                    carta={i.carta}
                    potenza={i.potenza}
                    tinta="tu"
                    onClick={() => setDettaglio(i.carta)}
                  />
                ))}
                <AnimatePresence>
                  {prossime.map((m) => (
                    <motion.div
                      key={m.carta.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border-2 border-dashed border-amber-300/70 p-0.5"
                    >
                      <DuelloTile
                        carta={m.carta}
                        potenza={m.carta.potenza}
                        tinta="tu"
                        onClick={() => setPending(pending.filter((x) => x !== m))}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <button
                className={`btn text-xs ${selCarta ? "btn-primary" : ""}`}
                disabled={
                  !selCarta ||
                  occupato ||
                  posti(k) <= 0 ||
                  speso + costoIn(selCarta, l) > stato.energia
                }
                onClick={() => gioca(k)}
                data-testid={`gioca-${k}`}
              >
                {selCarta && speso + costoIn(selCarta, l) > stato.energia
                  ? it.duello.troppoCara
                  : posti(k) <= 0
                    ? it.duello.corsiaPiena
                    : it.duello.gioca}
              </button>
            </section>
          );
        })}
      </div>

      <div
        className="min-h-6 text-center text-sm font-bold text-amber-200"
        aria-live="polite"
        data-testid="duello-caption"
      >
        {caption ?? (stato.finita ? "" : selCarta ? it.duello.sceltaCorsia : it.duello.sceltaCarta)}
      </div>

      {!stato.finita && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-black" data-testid="duello-energia">
              ⚡ {it.duello.energia}: {stato.energia - speso}/{stato.energia}
            </span>
            <div className="flex gap-2">
              {occupato && onSalta && (
                <button className="btn" onClick={onSalta}>
                  {it.duello.salta}
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={occupato}
                onClick={() =>
                  onConferma(pending.map((m) => ({ carta: m.carta.id, corsia: m.corsia })))
                }
                data-testid="duello-conferma"
              >
                {pending.length ? it.duello.conferma : it.duello.passa}
              </button>
            </div>
          </div>
          <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-2">
            {inMano.map((c) => (
              <div key={c.id} className="w-44 shrink-0 snap-start sm:w-52">
                <DuelloCard
                  carta={c}
                  selected={sel === c.id}
                  dim={c.costo > stato.energia - speso}
                  onClick={() => setSel(sel === c.id ? null : c.id)}
                  testId="duello-mano"
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {attesa}
      {dettaglio && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setDettaglio(null)}
          data-testid="duello-dettaglio"
        >
          <div className="w-64" onClick={(e) => e.stopPropagation()}>
            <DuelloCard carta={dettaglio} />
            <button className="btn mt-3 w-full" onClick={() => setDettaglio(null)}>
              {it.duello.chiudi}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
