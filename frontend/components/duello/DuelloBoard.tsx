"use client";

import Icon from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import it from "@/i18n/it.json";
import { ARCH_NOMI } from "@/lib/battle/labels";
import { temaLuogo } from "@/lib/luoghiTema";
import { costoIn, postiMax, type CartaView, type MossaIn, type StatoView } from "@/lib/duello";
import { CartaRetro } from "@/components/carta/Carta";
import DuelloCard, { DuelloTile } from "./DuelloCard";

interface Mossa {
  carta: CartaView;
  corsia: number;
}

function Vuoto({ attivo }: { attivo?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`aspect-[1/1.2] rounded-[3px] border-[1.5px] border-dashed ${
        attivo ? "border-[#ffd21f] bg-[#ffd21f]/10" : "border-white/20 bg-black/25"
      }`}
    />
  );
}

/** Il mazzo come pila di carte coperte: più carte restano, più è alta. */
function PilaMazzo({ n }: { n: number }) {
  const strati = Math.min(4, Math.max(0, Math.ceil(n / 2)));
  if (n <= 0) return null;
  return (
    <span className="pila w-6 sm:w-7" aria-hidden="true" title={String(n)}>
      {Array.from({ length: strati }, (_, i) => (
        <i
          key={i}
          style={{ transform: `translate(${(strati - i) * 2}px, ${(strati - i) * 2.5}px)` }}
        />
      ))}
      <CartaRetro />
    </span>
  );
}

/** Gemme a rombo: piene quelle disponibili, vuote quelle spese. */
function Gemme({ tot, piene, piccolo }: { tot: number; piene: number; piccolo?: boolean }) {
  return (
    <span className="inline-flex items-center gap-[0.45em] px-1" aria-hidden="true">
      {Array.from({ length: tot }, (_, i) => (
        <i
          key={i}
          className={`${piccolo ? "size-2" : "size-3"} rotate-45 border-[1.5px] border-black outline outline-1 outline-[#ffd21f]/60 ${
            i < piene ? "bg-[#ffd21f]" : "bg-transparent"
          }`}
        />
      ))}
    </span>
  );
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
  const [infoLuogo, setInfoLuogo] = useState<number | null>(null);
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

  const pulisci = (t: string) => t.replace(/^(Al rivelarsi|Continuo):\s*/i, "");
  const luogoInfo = infoLuogo !== null ? stato.luoghi[infoLuogo] : null;
  const didascalia =
    caption ??
    (stato.finita
      ? ""
      : selCarta
        ? `${selCarta.nome}: ${pulisci(selCarta.testo_mossa)} · ${pulisci(selCarta.testo_passiva)} — ${it.duello.sceltaCorsia}`
        : luogoInfo
          ? `${luogoInfo.nome}: ${luogoInfo.regola}${
              luogoInfo.favorisce.length
                ? ` (${luogoInfo.favorisce.map((a) => `+1 ${ARCH_NOMI[a] ?? a}`).join(", ")})`
                : ""
            }`
          : it.duello.sceltaCarta);

  return (
    <div className="space-y-2.5 md:space-y-4" data-testid="duello-gioco">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.7rem] leading-none sm:text-4xl" data-testid="duello-turno">
            {fmt(it.duello.turno, { n: Math.min(stato.turno, stato.turni), tot: stato.turni })}
          </h1>
          <span className="mt-1.5 flex gap-1" aria-hidden="true">
            {Array.from({ length: stato.turni }, (_, i) => (
              <i
                key={i}
                className={`h-1.5 w-5 -skew-x-[20deg] sm:w-8 ${
                  i < Math.min(stato.turno, stato.turni) ? "bg-[var(--accent)]" : "bg-white/15"
                }`}
              />
            ))}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-right text-xs font-bold leading-tight">
          <div>
            <div className="text-carta">
              {fmt(it.duello.oppMano, { nome: avversario, n: stato.mano_cpu })}
            </div>
            <div className="muted">{fmt(it.duello.mazzoRimasto, { n: stato.mazzo })}</div>
          </div>
          <PilaMazzo n={stato.mazzo} />
          <div className="flex pl-2" aria-hidden="true">
            {Array.from({ length: Math.min(5, stato.mano_cpu) }, (_, i) => (
              <span key={i} className="-ml-2 w-6 sm:w-7" style={{ rotate: `${(i - 2) * 5}deg` }}>
                <CartaRetro />
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* le tre corsie stanno sempre affiancate, anche su telefono: tutta la partita in uno schermo */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-4">
        {stato.luoghi.map((l, k) => {
          const [tu, cpu] = stato.totali[k];
          const mie = stato.corsie[k][0];
          const loro = stato.corsie[k][1];
          const prossime = pending.filter((m) => m.corsia === k);
          const tema = temaLuogo(l.id);
          const migliore = tu > cpu ? "tu" : cpu > tu ? "cpu" : "";
          const bordo = migliore === "tu" ? "#35d68a" : migliore === "cpu" ? "#ff5a45" : "#3a3842";
          const griglia = {
            ["--posti" as string]: postiMax(l),
          };
          const clsGriglia =
            "relative grid grid-cols-2 content-start gap-1 md:gap-1.5 md:[grid-template-columns:repeat(var(--posti),minmax(0,1fr))]";
          return (
            <section
              key={l.id + k}
              className="relative isolate flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-[5px] border-2 p-1.5 md:gap-2 md:p-3"
              style={{
                borderColor: bordo,
                boxShadow: `3px 3px 0 ${migliore ? bordo : "#000"}`,
                background: `linear-gradient(180deg, ${tema.da}, ${tema.a})`,
              }}
              data-testid={`corsia-${k}`}
            >
              <i
                aria-hidden="true"
                className="retino pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 opacity-35"
                style={{
                  ["--accent" as string]: tema.accento,
                  WebkitMaskImage: "linear-gradient(#000, transparent)",
                  maskImage: "linear-gradient(#000, transparent)",
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-[0.1]"
                style={{ color: tema.accento }}
              >
                <Icon name={tema.simbolo} className="size-24 md:size-48" />
              </span>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setInfoLuogo(infoLuogo === k ? null : k)}
                  aria-expanded={infoLuogo === k}
                  className="display flex min-h-8 w-full items-center justify-center gap-1 text-[0.95rem] leading-none md:pointer-events-none md:gap-2 md:text-2xl"
                  style={{ color: tema.accento }}
                >
                  <Icon name={tema.simbolo} className="size-[1em] shrink-0" />
                  <span className="truncate">{l.nome}</span>
                </button>
                <p className="mt-1 hidden text-xs font-medium leading-snug text-white/85 md:block">
                  {l.regola}
                </p>
                {l.favorisce.length > 0 && (
                  <p className="mt-1.5 hidden flex-wrap justify-center gap-1 md:flex">
                    {l.favorisce.map((a) => (
                      <span
                        key={a}
                        className="px-1.5 py-0.5 text-[0.68rem] font-black uppercase tracking-wide text-black"
                        style={{ background: tema.accento }}
                      >
                        +1 {ARCH_NOMI[a] ?? a}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className={clsGriglia} style={griglia}>
                {loro.map((i) => (
                  <DuelloTile
                    key={i.uid}
                    carta={i.carta}
                    potenza={i.potenza}
                    tinta="cpu"
                    onClick={() => setDettaglio(i.carta)}
                  />
                ))}
                {Array.from({ length: Math.max(0, postiMax(l) - loro.length) }, (_, n) => (
                  <Vuoto key={`vl${n}`} />
                ))}
              </div>
              {/* il punteggio della corsia: chi è avanti ha il numero su fondo pieno */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch border-2 border-black bg-black text-center">
                <span
                  className={`grid place-items-center px-1 py-0.5 leading-none ${
                    migliore === "tu" ? "bg-[#35d68a] text-black" : "text-[#6fe6ad]"
                  }`}
                >
                  <small className="text-[0.5rem] font-black uppercase tracking-[0.18em] opacity-80">
                    {it.duello.tu}
                  </small>
                  <span className="num text-lg md:text-3xl" data-testid={`tot-tu-${k}`}>
                    {tu}
                  </span>
                </span>
                <span className="display hidden items-center px-2 text-sm tracking-widest text-carta md:flex">
                  {tu > cpu ? it.duello.inVantaggio : cpu > tu ? it.duello.inSvantaggio : "PARI"}
                </span>
                <span
                  className={`col-start-3 grid place-items-center px-1 py-0.5 leading-none ${
                    migliore === "cpu" ? "bg-[#e0301f] text-white" : "text-[#ff9c8f]"
                  }`}
                >
                  <small className="max-w-full truncate text-[0.5rem] font-black uppercase tracking-[0.18em] opacity-80">
                    {it.duello.cpu}
                  </small>
                  <span className="num text-lg md:text-3xl" data-testid={`tot-cpu-${k}`}>
                    {cpu}
                  </span>
                </span>
              </div>
              <div className={clsGriglia} style={griglia}>
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
                      initial={{ opacity: 0, y: 16, scale: 1.25, rotate: -6 }}
                      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="relative outline-dashed outline-2 outline-offset-1 outline-[#ffd21f]"
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
                {Array.from({ length: Math.max(0, posti(k)) }, (_, n) => (
                  <Vuoto key={`vm${n}`} attivo={!!selCarta} />
                ))}
              </div>
              <button
                className={`btn mt-auto min-h-11 px-1 text-[0.8rem] md:text-base ${selCarta ? "btn-primary" : ""} ${stato.finita ? "hidden" : ""}`}
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

      {stato.finita && (
        <div
          className="min-h-6 text-center text-sm font-bold leading-snug text-amber-200"
          aria-live="polite"
          data-testid="duello-caption"
        >
          {didascalia}
        </div>
      )}

      {!stato.finita && (
        <section className="vetro barra-vetro sticky bottom-[3.75rem] z-30 space-y-1.5 rounded-[6px] !overflow-visible p-2 [--vetro:#15141a] sm:bottom-2 md:p-3">
          <div
            className={`line-clamp-2 min-h-[2.4em] text-[0.8rem] font-bold leading-[1.2] sm:text-sm ${
              caption ? "text-[#ffd21f]" : "text-[#dcd5c5]"
            }`}
            aria-live="polite"
            data-testid="duello-caption"
          >
            {caption && (
              <span key={caption} className="onoma colpo mr-2 text-base" aria-hidden="true">
                {it.duello.grido}
              </span>
            )}
            {didascalia}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center text-sm font-black" data-testid="duello-energia">
              <Icon name="bolt" className="size-[1.2em] text-amber-300" />
              <span className="sr-only sm:not-sr-only sm:ml-1">{it.duello.energia}:</span>
              <span className="num ml-1.5 text-base text-[#ffd21f]">
                {stato.energia - speso}/{stato.energia}
              </span>
              <span className="ml-1.5">
                <Gemme tot={Math.min(8, stato.energia)} piene={stato.energia - speso} />
              </span>
            </span>
            <div className="flex gap-2">
              {occupato && onSalta && (
                <button className="btn" onClick={onSalta}>
                  {it.duello.salta}
                </button>
              )}
              <button
                className="btn btn-primary px-4"
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
          <div className="flex snap-x gap-2.5 overflow-x-auto px-1 pb-1.5 pt-2.5">
            {inMano.map((c) => (
              <div key={c.id} className="w-[5.4rem] shrink-0 snap-start sm:w-32 lg:w-36">
                <DuelloCard
                  mano
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
          className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4"
          onClick={() => setDettaglio(null)}
          data-testid="duello-dettaglio"
        >
          <div className="w-64 max-w-full" onClick={(e) => e.stopPropagation()}>
            <DuelloCard carta={dettaglio} />
            <button className="btn mt-5 w-full" onClick={() => setDettaglio(null)}>
              {it.duello.chiudi}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
