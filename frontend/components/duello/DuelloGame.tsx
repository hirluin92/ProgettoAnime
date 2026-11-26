"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import PremioPanel from "@/components/PremioPanel";
import it from "@/i18n/it.json";
import { ARCH_NOMI } from "@/lib/battle/labels";
import { api } from "@/lib/api";
import {
  LIVELLI,
  TUTORIAL_KEY,
  costoIn,
  postiMax,
  type CartaView,
  type DraftDuello,
  type DuelloState,
  ENERGIA_TOTALE,
  type EventoDuello,
  type GiornoEsito,
  type GiornoInfo,
  type GiornoRiga,
  type PickDuello,
  type StatoView,
  type TurnoOut,
} from "@/lib/duello";
import { getProfileId, useProfile } from "@/lib/profile";
import Link from "next/link";
import DuelloCard, { DuelloTile } from "./DuelloCard";

type Fase = "regole" | "draft" | "gioco";
interface Mossa {
  carta: CartaView;
  corsia: number;
}

const fmt = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

function Regole({ onOk }: { onOk: () => void }) {
  return (
    <section className="panel mx-auto max-w-xl space-y-4 p-6" data-testid="duello-regole">
      <h2 className="display text-3xl font-black">{it.duello.regole}</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        {it.duello.regoleLista.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      <button className="btn btn-primary w-full" onClick={onOk} data-testid="duello-capito">
        {it.duello.capito}
      </button>
    </section>
  );
}

function Stelle({ n }: { n: number }) {
  return (
    <span aria-label={`${n} stelle`} className="text-amber-300">
      {"★".repeat(n)}
      <span className="text-white/20">{"★".repeat(3 - n)}</span>
    </span>
  );
}

function ClassificaGiorno({ righe }: { righe: GiornoRiga[] }) {
  return (
    <section className="panel space-y-2 p-5" data-testid="giorno-classifica">
      <h2 className="eyebrow">{it.duello.classifica}</h2>
      {righe.length === 0 ? (
        <p className="text-sm muted">{it.duello.nessunoOggi}</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {righe.map((r, i) => (
            <li key={r.nome} className="flex items-center justify-between gap-3">
              <span>
                {i + 1}. {r.nome}
              </span>
              <span>
                <Stelle n={r.stelle} /> <span className="muted">({r.punteggio})</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs muted">{it.duello.stelleSpiega}</p>
    </section>
  );
}

export default function DuelloGame({ giorno = false }: { giorno?: boolean }) {
  const [fase, setFase] = useState<Fase>("draft");
  const [draft, setDraft] = useState<DraftDuello | null>(null);
  const [h, setH] = useState(0);
  const [rilanci, setRilanci] = useState(0);
  const [picks, setPicks] = useState<PickDuello[]>([]);
  const [livello, setLivello] = useState<string>("normale");
  const [partita, setPartita] = useState<DuelloState | null>(null);
  const [stato, setStato] = useState<StatoView | null>(null);
  const [pending, setPending] = useState<Mossa[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [esito, setEsito] = useState<TurnoOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skip = useRef(false);
  const { profile } = useProfile();
  const [info, setInfo] = useState<GiornoInfo | null>(null);
  const [nome, setNome] = useState("");
  const [esitoGiorno, setEsitoGiorno] = useState<GiornoEsito | null>(null);
  const [dettaglio, setDettaglio] = useState<CartaView | null>(null);

  const carica = useCallback(async () => {
    setError(null);
    setH(0);
    setRilanci(0);
    setPicks([]);
    setPartita(null);
    setStato(null);
    setEsito(null);
    setPending([]);
    setSel(null);
    setEsitoGiorno(null);
    setFase(window.localStorage.getItem(TUTORIAL_KEY) || giorno ? "draft" : "regole");
    if (giorno) {
      setInfo(await api<GiornoInfo>("/api/duello/giorno/info"));
      return;
    }
    setDraft(await api<DraftDuello>("/api/duello/draft"));
  }, [giorno]);
  useEffect(() => {
    carica().catch((e: Error) => setError(e.message));
  }, [carica]);

  const err = (e: unknown) => setError(e instanceof Error ? e.message : it.duello.errore);

  if (error)
    return (
      <main className="mx-auto max-w-md p-6 pt-16">
        <div role="alert" className="panel space-y-4 p-6 text-center">
          <p className="text-lg font-bold">{error}</p>
          <button className="btn btn-primary" onClick={() => carica().catch(err)}>
            {it.errori.riprova}
          </button>
        </div>
      </main>
    );
  if (giorno ? !info : !draft) return <main className="p-6">{it.stanza.connessione}</main>;

  if (fase === "regole")
    return (
      <main className="mx-auto max-w-7xl p-4 pt-8">
        <Regole
          onOk={() => {
            window.localStorage.setItem(TUTORIAL_KEY, "1");
            setFase("draft");
          }}
        />
      </main>
    );

  // ---------- rompicapo del giorno: presentazione ----------
  if (giorno && info && (fase === "draft" || !partita || !stato)) {
    const gia = info.classifica.some(
      (r) => r.nome.toLowerCase() === (nome || profile?.name || "").trim().toLowerCase(),
    );
    const nomeFinale = (nome || profile?.name || "").trim();
    const via = async () => {
      setBusy(true);
      try {
        const g = await api<DuelloState>("/api/duello/giorno/start", {
          method: "POST",
          body: JSON.stringify({ name: nomeFinale, profile_id: getProfileId() }),
        });
        setPartita(g);
        setStato(g.stato);
        setFase("gioco");
      } catch (e) {
        err(e);
      } finally {
        setBusy(false);
      }
    };
    return (
      <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="duello-giorno">
        <header className="space-y-1">
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="display text-4xl font-black">{it.duello.giornoTitolo}</h1>
          <p className="text-sm muted">{it.duello.giornoTesto}</p>
        </header>
        <section className="space-y-2">
          <h2 className="eyebrow">{it.duello.latuoMazzo}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {info.mazzo.map((c) => (
              <DuelloTile key={c.id} carta={c} potenza={c.potenza} />
            ))}
          </div>
          <h2 className="eyebrow pt-2">{it.duello.mazzoCpu}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {info.mazzo_cpu.map((c) => (
              <DuelloTile key={c.id} carta={c} potenza={c.potenza} tinta="cpu" />
            ))}
          </div>
        </section>
        <section className="panel flex flex-wrap items-end gap-3 p-5">
          <label className="flex-1 space-y-1 text-sm">
            <span className="eyebrow">{it.duello.tuoNome}</span>
            <input
              className="field w-full"
              maxLength={24}
              value={nome || profile?.name || ""}
              onChange={(e) => setNome(e.target.value)}
              data-testid="giorno-nome"
            />
          </label>
          <button
            className="btn btn-gold"
            disabled={busy || !nomeFinale || gia}
            onClick={via}
            data-testid="giorno-via"
          >
            {gia ? it.duello.giaGiocato : it.duello.giocaGiorno}
          </button>
        </section>
        <ClassificaGiorno righe={info.classifica} />
        <Link href="/duello" className="text-sm underline muted">
          {it.duello.indietro}
        </Link>
      </main>
    );
  }
  // ---------- draft ----------
  if (fase === "draft" || !partita || !stato) {
    if (!draft) return null;
    const pronto = picks.length === draft.mazzo;
    const mano = draft.mani[h] ?? [];
    const scelte = picks.map((p) => draft.mani[p.hand].find((c) => c.id === p.id)!);
    const prendi = (c: CartaView) => {
      setPicks([...picks, { id: c.id, hand: h }]);
      setH(h + 1);
    };
    const inizia = async () => {
      setBusy(true);
      try {
        const g = await api<DuelloState>("/api/duello/start", {
          method: "POST",
          body: JSON.stringify({
            seed: draft.seed,
            picks,
            livello,
            profile_id: getProfileId(),
          }),
        });
        setPartita(g);
        setStato(g.stato);
        setFase("gioco");
      } catch (e) {
        err(e);
      } finally {
        setBusy(false);
      }
    };
    return (
      <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="duello-draft">
        <header className="space-y-1">
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="display text-4xl font-black">
            {pronto ? it.duello.mazzoPronto : it.duello.scegli}
          </h1>
          <p className="text-sm muted">{it.duello.sottotitolo}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <Link href="/duello/giorno" className="chip text-amber-200" data-testid="link-giorno">
              ★ {it.duello.giornoLink}
            </Link>
            {profile && (
              <span className="chip" data-testid="duello-elo">
                {fmt(it.duello.tuoElo, { n: profile.elo })}
              </span>
            )}
          </div>
        </header>
        {!pronto && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold" data-testid="duello-conta">
                {fmt(it.duello.mano, { n: picks.length + 1, tot: draft.mazzo })}
              </span>
              <button
                className="btn"
                disabled={rilanci >= draft.rilanci}
                onClick={() => {
                  setRilanci(rilanci + 1);
                  setH(h + 1);
                }}
                data-testid="duello-rilancia"
              >
                {fmt(it.duello.rilancia, { n: draft.rilanci - rilanci })}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {mano.map((c) => (
                <DuelloCard
                  key={c.id}
                  carta={c}
                  onClick={() => prendi(c)}
                  testId="duello-offerta"
                />
              ))}
            </div>
          </section>
        )}
        {scelte.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm" data-testid="duello-costo">
              {fmt(it.duello.costoMazzo, {
                n: scelte.reduce((t, c) => t + c.costo, 0),
                tot: ENERGIA_TOTALE,
              })}
            </p>
            <p className="text-xs muted">{it.duello.consiglioCosto}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {scelte.map((c) => (
                <DuelloTile key={c.id} carta={c} potenza={c.potenza} />
              ))}
            </div>
          </section>
        )}
        {pronto && (
          <section className="panel space-y-4 p-5">
            <div className="space-y-2">
              <span className="eyebrow">{it.duello.livello}</span>
              <div className="flex gap-2">
                {LIVELLI.map((l) => (
                  <button
                    key={l}
                    className={`btn ${livello === l ? "btn-primary" : ""}`}
                    aria-pressed={livello === l}
                    onClick={() => setLivello(l)}
                  >
                    {it.duello.livelli[l]}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-gold w-full"
              disabled={busy}
              onClick={inizia}
              data-testid="duello-inizia"
            >
              {it.duello.inizia}
            </button>
          </section>
        )}
      </main>
    );
  }

  // ---------- partita ----------
  const speso = pending.reduce((s, m) => s + costoIn(m.carta, stato.luoghi[m.corsia]), 0);
  const inMano = stato.mano.filter((c) => !pending.some((m) => m.carta.id === c.id));
  const selCarta = inMano.find((c) => c.id === sel) ?? null;
  const posti = (k: number) =>
    postiMax(stato.luoghi[k]) -
    stato.corsie[k][0].length -
    pending.filter((m) => m.corsia === k).length;

  const gioca = (k: number) => {
    if (!selCarta || busy) return;
    const costo = costoIn(selCarta, stato.luoghi[k]);
    if (speso + costo > stato.energia || posti(k) <= 0) return;
    setPending([...pending, { carta: selCarta, corsia: k }]);
    setSel(null);
  };

  const conferma = async () => {
    if (!partita || busy) return;
    setBusy(true);
    skip.current = false;
    try {
      const out = await api<TurnoOut>(`/api/duello/${partita.id}/turno`, {
        method: "POST",
        body: JSON.stringify({
          mosse: pending.map((m) => ({ carta: m.carta.id, corsia: m.corsia })),
        }),
      });
      const rivela = out.eventi.filter((e: EventoDuello) => e.t === "rivela" && e.carta_view);
      for (const e of rivela) {
        if (skip.current) break;
        setCaption(
          fmt(it.duello.rivela, {
            chi: e.lato === 0 ? it.duello.tu : it.duello.cpu,
            carta: e.carta_view!.nome,
            n: (e.corsia ?? 0) + 1,
          }) + (e.carta_view!.mossa !== "-" ? ` — ${e.carta_view!.testo_mossa}` : ""),
        );
        await new Promise((r) => setTimeout(r, 750));
      }
      setCaption(null);
      setPending([]);
      setSel(null);
      setStato(out.stato);
      if (out.finita) {
        setEsito(out);
        if (giorno)
          setEsitoGiorno(await api<GiornoEsito>(`/api/duello/giorno/${partita.id}/esito`));
      }
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const vinteTu = stato.corsie_vinte[0];
  const vinteCpu = stato.corsie_vinte[1];

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-3 pt-5" data-testid="duello-gioco">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="display text-3xl font-black" data-testid="duello-turno">
            {fmt(it.duello.turno, { n: Math.min(stato.turno, stato.turni), tot: stato.turni })}
          </h1>
        </div>
        <div className="text-right text-xs muted">
          <div>{fmt(it.duello.cpuMano, { n: stato.mano_cpu })}</div>
          <div>{fmt(it.duello.mazzoRimasto, { n: stato.mazzo })}</div>
        </div>
      </header>

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
              <div className="grid min-h-[92px] grid-cols-4 content-start gap-1.5">
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
              <div className="grid min-h-[92px] grid-cols-4 content-start gap-1.5">
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
                  !selCarta || busy || posti(k) <= 0 || speso + costoIn(selCarta, l) > stato.energia
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
              {busy && (
                <button className="btn" onClick={() => (skip.current = true)}>
                  {it.duello.salta}
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={conferma}
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

      {esito && stato.finita && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel space-y-4 p-6 text-center"
          data-testid="duello-esito"
        >
          <h2 className="display text-grad text-5xl font-black">
            {esito.vinto === null
              ? it.duello.pareggio
              : esito.vinto
                ? it.duello.vittoria
                : it.duello.sconfitta}
          </h2>
          <p className="muted">{fmt(it.duello.corsieVinte, { a: vinteTu, b: vinteCpu })}</p>
          {esitoGiorno && (
            <div className="space-y-3 text-left">
              <div className="text-center text-3xl">
                <Stelle n={esitoGiorno.stelle} />
              </div>
              <p className="text-center text-sm muted">
                {fmt(it.duello.posizione, { n: esitoGiorno.posizione })}
              </p>
              <ClassificaGiorno righe={esitoGiorno.classifica} />
            </div>
          )}
          {esito.premio && <PremioPanel premio={esito.premio} />}
          <button
            className="btn btn-primary"
            onClick={() => (giorno ? (window.location.href = "/duello") : carica().catch(err))}
            data-testid="duello-rigioca"
          >
            {giorno ? it.duello.indietro : it.duello.rigioca}
          </button>
        </motion.section>
      )}
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
    </main>
  );
}
