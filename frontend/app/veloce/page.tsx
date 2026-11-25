"use client";

import { useCallback, useEffect, useState } from "react";
import BattleScene from "@/components/battle/BattleScene";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { MatchResult } from "@/lib/types/match";

interface Option {
  character: Parameters<typeof CharacterCard>[0]["character"] & { id: string };
  cost: number;
}
interface Options {
  seed: number;
  budget: number;
  roles: string[];
  options: Record<string, Option[]>;
}
interface Played {
  id: string;
  result: MatchResult;
  spent: number;
  cpu_spent: number;
}

export default function Veloce() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [picks, setPicks] = useState<Option[]>([]);
  const [played, setPlayed] = useState<Played | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setPicks([]);
    setPlayed(null);
    setError(null);
    setOpts(await api<Options>("/api/quick/options"));
  }, []);
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
          await api<Played>("/api/quick/play", {
            method: "POST",
            body: JSON.stringify({ seed: opts.seed, picks: next.map((p) => p.character.id) }),
          }),
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
        <h1 className="text-3xl font-black">{it.veloce.titolo}</h1>
        <p className="text-sm">
          {it.veloce.speso}: {played.spent}/{opts.budget} · CPU: {played.cpu_spent}/{opts.budget} ·{" "}
          <a className="underline" href={`/partita/${played.id}`}>
            {it.battle.linkPartita}
          </a>
        </p>
        <BattleScene result={played.result} autoplay />
        <button
          className="min-h-11 rounded-xl bg-rose-600 px-5 font-bold text-white"
          onClick={() => void start()}
        >
          {it.veloce.rigioca}
        </button>
      </main>
    );

  if (step >= opts.roles.length) return <main className="p-6">{it.veloce.calcolo}</main>;
  const role = opts.roles[step];
  const rolesLeft = opts.roles.length - step;
  const maxCost = opts.budget - spent - (rolesLeft - 1);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-3xl font-black">{it.veloce.titolo}</h1>
      <p data-testid="step">
        {it.veloce.scegli} <b>{role}</b> ({step + 1}/{opts.roles.length}) · {it.stanza.budget}:{" "}
        <b data-testid="left">{opts.budget - spent}</b>
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {opts.options[role].map((o) => {
          const taken = picks.some((p) => p.character.id === o.character.id);
          const disabled = o.cost > maxCost || taken;
          return (
            <li key={o.character.id}>
              <button
                data-testid="option"
                disabled={disabled}
                onClick={() => void choose(o)}
                className="grid min-h-11 w-full justify-items-center gap-1 rounded-xl p-1 disabled:opacity-40"
                aria-label={`${o.character.nome}, costo ${o.cost}`}
              >
                <CharacterCard character={o.character} role={role} />
                <span className="font-black">
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
