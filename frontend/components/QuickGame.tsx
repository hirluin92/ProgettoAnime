"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import BattleScene from "@/components/battle/BattleScene";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import type { MatchResult } from "@/lib/types/match";

export interface Option {
  character: Parameters<typeof CharacterCard>[0]["character"] & { id: string };
  cost: number;
}
export interface Options {
  seed: number;
  budget: number;
  roles: string[];
  options: Record<string, Option[]>;
}
export interface Played {
  id: string;
  result: MatchResult;
  spent: number;
  cpu_spent: number;
}

interface Props {
  title: string;
  load: () => Promise<Options>;
  play: (opts: Options, ids: string[]) => Promise<Played>;
  after?: ReactNode;
  header?: ReactNode;
}

export default function QuickGame({ title, load, play, after, header }: Props) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [picks, setPicks] = useState<Option[]>([]);
  const [played, setPlayed] = useState<Played | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setPicks([]);
    setPlayed(null);
    setError(null);
    setOpts(await load());
  }, [load]);
  useEffect(() => {
    start().catch((e: Error) => setError(e.message));
  }, [start]);

  const spent = picks.reduce((s, p) => s + p.cost, 0);
  const step = picks.length;

  const choose = async (o: Option) => {
    if (!opts) return;
    const next = [...picks, o];
    setPicks(next);
    if (next.length === opts.roles.length) {
      try {
        setPlayed(
          await play(
            opts,
            next.map((p) => p.character.id),
          ),
        );
      } catch (e) {
        setError((e as Error).message);
      }
    }
  };

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
  if (!opts) return <main className="p-6">{it.stanza.connessione}</main>;

  if (played)
    return (
      <main className="mx-auto max-w-5xl space-y-3 p-4">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-sm muted">
          {it.veloce.speso}: {played.spent}/{opts.budget} · CPU: {played.cpu_spent}/{opts.budget} ·{" "}
          <a className="underline hover:text-white" href={`/partita/${played.id}`}>
            {it.battle.linkPartita}
          </a>
        </p>
        <BattleScene result={played.result} autoplay />
        {after}
      </main>
    );

  if (step >= opts.roles.length) return <main className="p-6">{it.veloce.calcolo}</main>;
  const role = opts.roles[step];
  const rolesLeft = opts.roles.length - step;
  const maxCost = opts.budget - spent - (rolesLeft - 1);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-4xl font-bold">{title}</h1>
      {header}
      <p className="text-xs muted">{it.veloce.passaSopra}</p>
      <p data-testid="step">
        {it.veloce.scegli} <b>{role}</b> ({step + 1}/{opts.roles.length}) · {it.stanza.budget}:{" "}
        <b data-testid="left">{opts.budget - spent}</b>
      </p>
      <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {opts.options[role].map((o) => {
          const taken = picks.some((p) => p.character.id === o.character.id);
          return (
            <li key={o.character.id} className="w-full min-w-0">
              <button
                data-testid="option"
                disabled={o.cost > maxCost || taken}
                onClick={() => void choose(o)}
                className="relative grid min-h-11 w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-2 rounded-2xl p-1 transition duration-150 hover:z-20 hover:-translate-y-2 hover:scale-110 focus-visible:z-20 focus-visible:scale-110 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:scale-100"
                aria-label={`${o.character.nome}, costo ${o.cost}`}
              >
                <CharacterCard character={o.character} role={role} fluid />
                <span className="chip text-gold">
                  {it.veloce.costo} {o.cost}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <section aria-label={it.veloce.squadra} data-testid="recap" className="panel p-4">
        <h2 className="mb-3 text-xl font-bold">{it.veloce.squadra}</h2>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {opts.roles.map((r, i) => {
            const pick = picks[i];
            const current = i === step;
            return (
              <li
                key={r}
                data-testid={pick ? "recap-filled" : "recap-empty"}
                className={`grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-center gap-1 rounded-xl p-2 text-center ${
                  pick
                    ? ""
                    : current
                      ? "border-2 border-dashed border-pink-400 bg-pink-500/10"
                      : "border border-dashed border-white/20"
                }`}
              >
                {pick ? (
                  <CharacterCard character={pick.character} role={r} fluid />
                ) : (
                  <div className="grid aspect-[3/4.2] w-full max-w-[230px] place-items-center rounded-xl text-xs">
                    <div>
                      <div className="display text-base font-bold">{r}</div>
                      <div className="muted">{current ? it.veloce.ora : it.veloce.vuoto}</div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
