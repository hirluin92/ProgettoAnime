"use client";

import { use, useEffect, useState } from "react";
import BattleScene from "@/components/battle/BattleScene";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { MatchResult } from "@/lib/types/match";

export default function PartitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<MatchResult>(`/api/matches/${id}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, [id]);
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-4xl font-bold">{it.battle.replay}</h1>
      {error && <p role="alert">{it.errori.partitaNonTrovata}</p>}
      {result && <BattleScene result={result} autoplay />}
    </main>
  );
}
