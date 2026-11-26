"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import BattleScene from "@/components/battle/BattleScene";
import CharacterCard from "@/components/battle/CharacterCard";
import { AffinityLegend } from "@/components/draft/Affinity";
import { CardDetail, DetailSheet } from "@/components/draft/CardDetail";
import SlotBoard from "@/components/draft/SlotBoard";
import TacticsPlanner from "@/components/draft/TacticsPlanner";
import { FASI, type Tattica } from "@/lib/battle/tattiche";
import it from "@/i18n/it.json";
import {
  allowed as canAfford,
  type DraftOptions,
  type Option,
  type PickIn,
  type Placed,
} from "@/lib/draft";
import type { MatchResult } from "@/lib/types/match";

export interface Played {
  id: string;
  result: MatchResult;
  spent: number;
  cpu_spent: number;
}

interface Props {
  title: string;
  load: () => Promise<DraftOptions>;
  play: (
    d: DraftOptions,
    picks: PickIn[],
    swap: string[] | null,
    tattiche: string[],
  ) => Promise<Played>;
  after?: ReactNode;
  header?: ReactNode;
}

export default function QuickGame({ title, load, play, after, header }: Props) {
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
  const [piano, setPiano] = useState<(Tattica | null)[]>(Array(FASI).fill(null));
  const [played, setPlayed] = useState<Played | null>(null);
  const [busy, setBusy] = useState(false);
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
    setPlayed(null);
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
  if (!d) return <main className="p-6">{it.stanza.connessione}</main>;

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
  const fight = async () => {
    setBusy(true);
    try {
      const picks = placed.map((p) => ({ id: p.option.character.id, role: p.role, hand: p.hand }));
      setPlayed(await play(d, picks, swap, piano as string[]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (played)
    return (
      <main className="mx-auto max-w-5xl space-y-3 p-4">
        <h1 className="text-5xl font-black leading-none">{title}</h1>
        <p className="text-sm muted">
          {it.veloce.speso}: {played.spent}/{d.budget} · CPU: {played.cpu_spent}/{d.budget} ·{" "}
          <a className="underline hover:text-white" href={`/partita/${played.id}`}>
            {it.battle.linkPartita}
          </a>
        </p>
        <BattleScene result={played.result} autoplay />
        {after}
      </main>
    );

  const swapping = !drafting;
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="reveal space-y-1">
        <span className="eyebrow">{it.veloce.draft}</span>
        <h1 className="text-5xl font-black leading-none sm:text-6xl">{title}</h1>
      </div>
      {header}

      <div className="panel space-y-3 p-4">
        <ol className="flex flex-wrap gap-1.5" aria-hidden="true">
          {d.roles.map((r, i) => (
            <li
              key={r}
              className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider transition ${
                i < round
                  ? "border-transparent bg-gradient-to-r from-pink-500 to-orange-400 text-white"
                  : i === round
                    ? "border-cyan-300 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgb(53_224_255/0.35)]"
                    : "text-white/40"
              }`}
            >
              {i < round ? "✓ " : ""}
              {i === d.mystery_round && i >= round ? "? " : ""}
              {it.draft.giro} {i + 1}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p data-testid="step" className="text-lg">
            {drafting ? (
              <>
                {isMystery ? it.draft.misteriosa : it.draft.scegli} ({round + 1}/{total}) ·{" "}
              </>
            ) : (
              <>{it.draft.scambio} · </>
            )}
            {it.stanza.budget}: <b data-testid="left">{d.budget - spent}</b>
          </p>
          <p className="text-xs muted" data-testid="rerolls">
            {it.draft.rilanci}: <b>{d.rerolls - rerolls}</b>/{d.rerolls}
          </p>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-black/40"
          role="progressbar"
          aria-label={it.stanza.budget}
          aria-valuemin={0}
          aria-valuemax={d.budget}
          aria-valuenow={d.budget - spent}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-500 transition-[width] duration-500"
            style={{ width: `${((d.budget - spent) / d.budget) * 100}%` }}
          />
        </div>
      </div>

      {drafting && (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-extrabold">
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
                  ↻ {it.draft.rilancia}
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
                    className="panel panel-hover grid aspect-[3/4.2] w-44 place-items-center gap-1 text-center"
                  >
                    <span className="display text-grad text-7xl font-black">?</span>
                    <span className="eyebrow justify-center">{it.draft.scopri}</span>
                    <span className="text-xs muted">
                      {it.veloce.costo} {hand.mystery_cost}
                    </span>
                  </button>
                ) : (
                  <div className="reveal grid justify-items-center gap-2">
                    <div className="w-44 sm:w-52">
                      <CharacterCard character={hand.cards[0].character} fluid />
                    </div>
                    <span className="chip text-gold">
                      {it.veloce.costo} {hand.mystery_cost}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <CardDetail o={focus ?? sel} />
                <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                  {hand.cards.map((o) => {
                    const good = ok(o);
                    const picked = sel?.character.id === o.character.id;
                    return (
                      <li key={o.character.id} className="relative w-full min-w-0">
                        <button
                          type="button"
                          aria-label={`${it.veloce.dettagli}: ${o.character.nome}`}
                          className="absolute right-2 top-2 z-30 grid size-7 place-items-center rounded-full border border-white/40 bg-black/70 text-xs font-black text-white backdrop-blur transition hover:scale-110 hover:bg-black/90"
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
                            picked ? "z-20 -translate-y-3 scale-105 ring-2 ring-cyan-300" : ""
                          }`}
                        >
                          <CharacterCard character={o.character} fluid />
                          <span className="chip text-gold">
                            {it.veloce.costo} {o.cost}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
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
        </>
      )}

      <section aria-label={it.veloce.squadra} data-testid="recap" className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-extrabold">{it.veloce.squadra}</h2>
          {drafting && sel && (
            <p className="text-sm text-cyan-100" data-testid="place-hint">
              {it.draft.scegliSlot.replace("{nome}", sel.character.nome)}
            </p>
          )}
          {swapping && (
            <p className="text-sm text-cyan-100" data-testid="swap-hint">
              {swap ? it.draft.scambiato : it.draft.scambiaHint}
            </p>
          )}
        </div>
        <AffinityLegend />
        <SlotBoard
          roles={d.roles}
          byRole={byRole}
          selected={sel}
          mode={drafting ? "place" : swapping && !swap ? "swap" : "idle"}
          swapFirst={swapFirst}
          onSlot={drafting ? place : onSwapSlot}
        />
        {swapping && (
          <TacticsPlanner
            value={piano}
            onChange={(f, t) => setPiano((p) => p.map((x, i) => (i === f ? t : x)))}
          />
        )}
        {swapping && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              className="btn btn-primary flex-1 text-lg"
              data-testid="fight"
              disabled={busy || piano.some((t) => t === null)}
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
