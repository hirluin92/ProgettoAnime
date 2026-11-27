"use client";

import Caricamento from "@/components/Caricamento";
import Icon from "@/components/Icon";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import BattleScene from "@/components/battle/BattleScene";
import { CartaRetro } from "@/components/carta/Carta";
import CharacterCard from "@/components/battle/CharacterCard";
import ArenaBanner from "@/components/ArenaBanner";
import PremioPanel from "@/components/PremioPanel";
import ShareButton from "@/components/ShareButton";
import MissionCard from "@/components/MissionCard";
import { AffinityLegend } from "@/components/draft/Affinity";
import { CardDetail, DetailSheet } from "@/components/draft/CardDetail";
import SlotBoard from "@/components/draft/SlotBoard";
import FaseReport from "@/components/draft/FaseReport";
import TacticsPlanner, { type Carica } from "@/components/draft/TacticsPlanner";
import { FASI, type Tattica } from "@/lib/battle/tattiche";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import {
  allowed as canAfford,
  type DraftOptions,
  type FaseOut,
  type MissioneEsito,
  type Option,
  type PickIn,
  type Placed,
} from "@/lib/draft";
import type { Premio } from "@/lib/profile";
import type { MatchResult } from "@/lib/types/match";

export interface Played {
  id: string;
  result: MatchResult;
  spent: number;
  cpu_spent: number;
  missione: MissioneEsito | null;
  premio: Premio | null;
  perche?: string[];
}

interface Props {
  title: string;
  load: () => Promise<DraftOptions>;
  play: (
    d: DraftOptions,
    picks: PickIn[],
    swap: string[] | null,
    tattiche: string[],
    carica: Carica,
    formazione: string,
  ) => Promise<Played>;
  after?: ReactNode;
  header?: ReactNode;
  senzaMissione?: boolean; // per la Scala: niente missione né spese mostrate
  fasiLive?: boolean; // Veloce: le tattiche si scelgono una fase alla volta
}

export default function QuickGame({
  title,
  load,
  play,
  after,
  header,
  senzaMissione,
  fasiLive,
}: Props) {
  const [d, setD] = useState<DraftOptions | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [h, setH] = useState(0); // indice della mano corrente
  const [rerolls, setRerolls] = useState(0);
  const [sel, setSel] = useState<Option | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [focus, setFocus] = useState<Option | null>(null);
  const [sheet, setSheet] = useState<Option | null>(null);
  const [swap, setSwap] = useState<[string, string] | null>(null);
  const [swapFirst, setSwapFirst] = useState<string | null>(null);
  const [carica, setCarica] = useState<Carica>("subito");
  const [formazione, setFormazione] = useState("classica");
  const [piano, setPiano] = useState<(Tattica | null)[]>(Array(FASI).fill(null));
  const [played, setPlayed] = useState<Played | null>(null);
  const [fasi, setFasi] = useState<FaseOut[]>([]);
  const [busy, setBusy] = useState(false);
  const [battleDone, setBattleDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setPlaced([]);
    setH(0);
    setRerolls(0);
    setSel(null);
    setRevealed(false);
    setFocus(null);
    setSheet(null);
    setSwap(null);
    setSwapFirst(null);
    setPiano(Array(FASI).fill(null));
    setFasi([]);
    setCarica("subito");
    setFormazione("classica");
    setPlayed(null);
    setBattleDone(false);
    setError(null);
    setD(await load());
  }, [load]);
  useEffect(() => {
    start().catch((e: Error) => setError(e.message));
  }, [start]);

  const round = placed.length;
  const spent = placed.reduce((s, p) => s + p.cost, 0);

  // carte finali per ruolo, con lo scambio già applicato (il server riceve le scelte originali + lo scambio)
  const byRole = useMemo(() => {
    const m: Record<string, Placed | undefined> = {};
    for (const p of placed) m[p.role] = p;
    if (swap) {
      const [a, b] = swap;
      [m[a], m[b]] = [m[b], m[a]];
    }
    return m;
  }, [placed, swap]);

  if (error)
    return (
      <main className="mx-auto max-w-md p-6 pt-16">
        <div role="alert" className="panel space-y-4 p-6 text-center">
          <p className="text-lg font-bold">{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            {it.errori.riprova}
          </button>
        </div>
      </main>
    );
  if (!d) return <Caricamento />;

  const total = d.roles.length;
  const drafting = round < total;
  const isMystery = drafting && round === d.mystery_round;
  const hand = d.hands[Math.min(h, d.hands.length - 1)];
  const roundsLeftAfter = total - round - 1;
  const costOf = (o: Option) => (isMystery ? hand.mystery_cost : o.cost);
  const ok = (o: Option) => canAfford(spent, costOf(o), roundsLeftAfter, d.budget, d.cheap);
  const blocked = drafting && !isMystery && hand.cards.every((o) => !ok(o));
  const canReroll = drafting && !isMystery && rerolls < d.rerolls && h + 1 < d.hands.length;

  const choose = (o: Option) => {
    setSel(o);
    setSheet(null);
  };
  const place = (role: string) => {
    if (!sel) return;
    const cost = costOf(sel);
    setPlaced([...placed, { option: sel, role, hand: h, cost }]);
    setH(h + 1);
    setSel(null);
    setRevealed(false);
    setFocus(null);
  };
  const reroll = () => {
    setH(h + 1);
    setRerolls(rerolls + 1);
    setSel(null);
    setFocus(null);
  };
  const onSwapSlot = (role: string) => {
    if (swap) return;
    if (!swapFirst) setSwapFirst(role);
    else if (swapFirst === role) setSwapFirst(null);
    else {
      setSwap([swapFirst, role]);
      setSwapFirst(null);
    }
  };
  const anteprima = async (n: number) => {
    setBusy(true);
    try {
      const picks = placed.map((p) => ({ id: p.option.character.id, role: p.role, hand: p.hand }));
      const r = await api<FaseOut>("/api/quick/fase", {
        method: "POST",
        body: JSON.stringify({
          seed: d.seed,
          picks,
          swap,
          tattiche: piano.slice(0, n),
          carica,
          formazione,
        }),
      });
      setFasi((f) => [...f.slice(0, n - 1), r]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const fight = async () => {
    setBusy(true);
    try {
      const picks = placed.map((p) => ({ id: p.option.character.id, role: p.role, hand: p.hand }));
      setPlayed(await play(d, picks, swap, piano as string[], carica, formazione));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (played)
    return (
      <main className="mx-auto max-w-7xl space-y-3 p-4">
        <h1 className="striscia text-4xl leading-none sm:text-5xl">{title}</h1>
        {!senzaMissione && (
          <p className="text-sm muted">
            {it.veloce.speso}: {played.spent}/{d.budget} · CPU: {played.cpu_spent}/{d.budget} ·{" "}
            <a className="underline hover:text-white" href={`/partita/${played.id}`}>
              {it.battle.linkPartita}
            </a>
          </p>
        )}
        <BattleScene result={played.result} autoplay onDone={() => setBattleDone(true)} />
        {battleDone && (
          <>
            {played.missione && (
              <div className="grid gap-3 md:grid-cols-2" data-testid="mission-result">
                <MissionCard
                  titolo={it.missione.tua}
                  nome={played.missione.nome}
                  descrizione={played.missione.descrizione}
                  esito={played.missione.riuscita}
                />
                <p className="text-sm muted">
                  {it.missione.cpu}:{" "}
                  {played.missione.cpu_riuscita ? it.missione.riuscita : it.missione.fallita}
                </p>
              </div>
            )}
            {played.perche && played.perche.length > 0 && (
              <section className="panel space-y-2 p-4" data-testid="perche">
                <h2 className="eyebrow">{it.battle.perche}</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {played.perche.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </section>
            )}
            <ShareButton matchId={played.id} vinto={played.result.vincitore === "A"} />
            {played.premio && <PremioPanel premio={played.premio} />}
          </>
        )}
        {battleDone && after}
      </main>
    );

  const swapping = !drafting;
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="testata reveal space-y-1">
        <span className="eyebrow">{it.veloce.draft}</span>
        <h1 className="text-4xl leading-none sm:text-5xl">{title}</h1>
      </div>
      {header}
      <ArenaBanner {...d.arena} />
      {!senzaMissione && (
        <MissionCard nome={d.missione.nome} descrizione={d.missione.descrizione} />
      )}

      <div className="panel space-y-3 p-4">
        <ol className="flex flex-wrap gap-1.5" aria-hidden="true">
          {d.roles.map((r, i) => (
            <li
              key={r}
              className={`border-2 px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                i < round
                  ? "border-black bg-carta text-nero"
                  : i === round
                    ? "border-black bg-[#e0301f] text-white shadow-[2px_2px_0_#000]"
                    : "border-[var(--line)] text-white/45"
              }`}
            >
              {i < round ? <Icon name="check" /> : null}{" "}
              {i === d.mystery_round && i >= round ? "? " : ""}
              {it.draft.giro} {i + 1}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p data-testid="step" className="text-lg font-bold">
            {drafting ? (
              <>
                {isMystery ? it.draft.misteriosa : it.draft.scegli} ({round + 1}/{total}) ·{" "}
              </>
            ) : (
              <>{it.draft.scambio} · </>
            )}
            {it.stanza.budget}:{" "}
            <b data-testid="left" className="num text-[#ffd21f]">
              {d.budget - spent}
            </b>
          </p>
          <p className="text-xs muted" data-testid="rerolls">
            {it.draft.rilanci}: <b>{d.rerolls - rerolls}</b>/{d.rerolls}
          </p>
        </div>
        <div
          className="barra"
          style={{ ["--accent" as string]: "var(--giallo)" }}
          role="progressbar"
          aria-label={it.stanza.budget}
          aria-valuemin={0}
          aria-valuemax={d.budget}
          aria-valuenow={d.budget - spent}
        >
          <div
            className="transition-[width] duration-500"
            style={{ width: `${((d.budget - spent) / d.budget) * 100}%` }}
          />
        </div>
      </div>

      <div
        className={
          drafting
            ? "grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start"
            : "space-y-4"
        }
      >
        {drafting && (
          <div className="min-w-0 space-y-4">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-3xl">
                  {isMystery ? it.draft.cartaMisteriosa : it.draft.laTuaMano}
                </h2>
                {!isMystery && (
                  <button
                    className="btn"
                    data-testid="reroll"
                    disabled={!canReroll}
                    onClick={reroll}
                    title={it.draft.rilancioHint}
                  >
                    <Icon name="refresh" /> {it.draft.rilancia}
                  </button>
                )}
              </div>

              {isMystery ? (
                <div className="grid place-items-center gap-3 py-2">
                  {!revealed ? (
                    <button
                      data-testid="mystery-card"
                      onClick={() => {
                        setRevealed(true);
                        setSel(hand.cards[0]);
                      }}
                      className="group relative grid w-44 justify-items-center gap-2 text-center transition-transform hover:-translate-y-1 hover:-rotate-2"
                    >
                      <span className="relative block w-full">
                        <CartaRetro />
                        <span className="onoma absolute inset-0 grid place-items-center text-7xl">
                          ?
                        </span>
                      </span>
                      <span className="eyebrow justify-center">{it.draft.scopri}</span>
                      <span className="chip border-black bg-[#ffd21f] text-black">
                        {it.veloce.costo} {hand.mystery_cost}
                      </span>
                    </button>
                  ) : (
                    <div className="reveal grid justify-items-center gap-2">
                      <div className="w-44 sm:w-52">
                        <CharacterCard character={hand.cards[0].character} fluid />
                      </div>
                      <span className="chip border-black bg-[#ffd21f] text-black">
                        {it.veloce.costo} {hand.mystery_cost}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* su schermi larghi la scheda sta sopra (altezza fissa); su telefono sotto le carte,
                      così aprirla non sposta le carte sotto il dito */}
                  <div className="hidden lg:block">
                    <CardDetail o={focus ?? sel} />
                  </div>
                  <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                    {hand.cards.map((o) => {
                      const good = ok(o);
                      const picked = sel?.character.id === o.character.id;
                      return (
                        <li key={o.character.id} className="relative w-full min-w-0">
                          <button
                            type="button"
                            aria-label={`${it.veloce.dettagli}: ${o.character.nome}`}
                            className="absolute left-0 top-0 z-30 grid size-9 place-items-center border-2 border-black bg-carta text-sm font-black italic text-nero transition-transform hover:scale-110"
                            onClick={() => setSheet(o)}
                          >
                            i
                          </button>
                          <button
                            data-testid="option"
                            disabled={!good}
                            aria-pressed={picked}
                            onClick={() => choose(o)}
                            onMouseEnter={() => setFocus(o)}
                            onFocus={() => setFocus(o)}
                            onMouseLeave={() => setFocus(null)}
                            aria-label={`${o.character.nome}, costo ${o.cost}`}
                            className={`relative grid min-h-11 w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-2 rounded-2xl p-1 transition duration-150 hover:z-20 hover:-translate-y-2 focus-visible:z-20 disabled:opacity-40 disabled:hover:translate-y-0 ${
                              picked ? "z-20 -translate-y-3 scale-105 outline outline-[3px] outline-offset-2 outline-carta" : ""
                            }`}
                          >
                            <CharacterCard character={o.character} fluid />
                            <span className="chip border-black bg-[#ffd21f] text-black">
                              {it.veloce.costo} {o.cost}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="lg:hidden">
                    <CardDetail o={focus ?? sel} />
                  </div>
                  {hand.cards.some((o) => !ok(o)) && !blocked && (
                    <p className="text-center text-xs muted" data-testid="draft-hint">
                      {it.draft.noteBudget}
                    </p>
                  )}
                </>
              )}
            </section>

            {blocked && (
              <div
                role="alert"
                className="panel space-y-3 p-4 text-center"
                data-testid="draft-blocked"
              >
                <p className="font-bold">{it.veloce.bloccato}</p>
                <button className="btn btn-primary" onClick={() => void start()}>
                  {it.veloce.ricomincia}
                </button>
              </div>
            )}
          </div>
        )}

        <section aria-label={it.veloce.squadra} data-testid="recap" className="panel space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl">{it.veloce.squadra}</h2>
            {drafting && sel && (
              <p className="balloon py-1.5 text-sm" data-testid="place-hint">
                {it.draft.scegliSlot.replace("{nome}", sel.character.nome)}
              </p>
            )}
            {swapping && (
              <p className="text-sm font-bold text-cyan-100" data-testid="swap-hint">
                {swap ? it.draft.scambiato : it.draft.scambiaHint}
              </p>
            )}
          </div>
          <AffinityLegend />
          <SlotBoard
            compatta={drafting}
            roles={d.roles}
            byRole={byRole}
            selected={sel}
            mode={drafting ? "place" : swapping && !swap && fasi.length === 0 ? "swap" : "idle"}
            swapFirst={swapFirst}
            onSlot={drafting ? place : onSwapSlot}
          />
          {swapping && (
            <TacticsPlanner
              live={
                fasiLive
                  ? { giocate: fasi.length, busy, onGioca: (n) => void anteprima(n) }
                  : undefined
              }
              value={piano}
              onChange={(f, t) => setPiano((p) => p.map((x, i) => (i === f ? t : x)))}
              carica={carica}
              onCarica={setCarica}
              formazione={formazione}
              onFormazione={setFormazione}
            />
          )}
          {swapping && fasi.map((r, i) => <FaseReport key={i} r={r} n={i + 1} />)}
          {swapping && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className="btn btn-primary min-h-14 flex-1 text-xl"
                data-testid="fight"
                disabled={
                  busy || piano.some((t) => t === null) || (!!fasiLive && fasi.length < FASI - 1)
                }
                onClick={() => void fight()}
              >
                {it.draft.combatti}
              </button>
              {swap && (
                <button
                  className="btn"
                  onClick={() => {
                    setSwap(null);
                    setSwapFirst(null);
                  }}
                >
                  {it.draft.annullaScambio}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {sheet && (
        <DetailSheet
          o={sheet}
          canPick={ok(sheet)}
          onClose={() => setSheet(null)}
          onPick={() => choose(sheet)}
        />
      )}
    </main>
  );
}
