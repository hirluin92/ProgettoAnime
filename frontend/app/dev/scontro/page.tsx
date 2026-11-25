"use client";

import { useState } from "react";
import BattleScene from "@/components/battle/BattleScene";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { MatchResult } from "@/lib/types/match";

export default function DevScontro() {
  const [match, setMatch] = useState<{ id: string; result: MatchResult } | null>(null);
  const load = async () => setMatch(await api("/api/dev/random-match", { method: "POST" }));
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-3 text-3xl font-black">{it.battle.provaTitolo}</h1>
      <button
        className="mb-4 min-h-11 rounded-xl bg-stone-900 px-5 font-bold text-amber-50"
        onClick={load}
      >
        {it.battle.nuovaSfida}
      </button>
      {match && (
        <>
          <p className="mb-2 text-sm">
            <a className="underline" href={`/partita/${match.id}`}>
              {it.battle.linkPartita}
            </a>
          </p>
          <BattleScene key={match.id} result={match.result} />
        </>
      )}
    </main>
  );
}
