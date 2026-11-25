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
      <main className="p-6" role="alert">
        {error}
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
      <p data-testid="step">
        {it.veloce.scegli} <b>{role}</b> ({step + 1}/{opts.roles.length}) · {it.stanza.budget}:{" "}
        <b data-testid="left">{opts.budget - spent}</b>
      </p>
      <ul className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {opts.options[role].map((o) => {
          const taken = picks.some((p) => p.character.id === o.character.id);
          return (
            <li key={o.character.id}>
              <button
                data-testid="option"
                disabled={o.cost > maxCost || taken}
                onClick={() => void choose(o)}
                className="grid min-h-11 w-full justify-items-center gap-2 rounded-2xl p-1 transition hover:-translate-y-1 disabled:opacity-40"
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
    </main>
  );
}
