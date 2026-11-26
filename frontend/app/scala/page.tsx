"use client";

import { useState } from "react";
import QuickGame, { type Played } from "@/components/QuickGame";
import ScalaLadder from "@/components/ScalaLadder";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { DraftOptions, PickIn } from "@/lib/draft";
import { getProfileId } from "@/lib/profile";
import type { ScalaResult, ScalaState } from "@/lib/scala";

const load = () => api<DraftOptions>("/api/quick/draft");

export default function ScalaPage() {
  const [first, setFirst] = useState<ScalaResult | null>(null);

  const play = async (
    d: DraftOptions,
    picks: PickIn[],
    swap: string[] | null,
    tattiche: string[],
    carica: string,
    formazione: string,
  ): Promise<Played> => {
    const run = await api<ScalaState>("/api/scala/start", {
      method: "POST",
      body: JSON.stringify({ seed: d.seed, picks, swap, profile_id: getProfileId() }),
    });
    const r = await api<ScalaResult>(`/api/scala/${run.run_id}/fight`, {
      method: "POST",
      body: JSON.stringify({ piano: { tattiche, carica, formazione } }),
    });
    setFirst(r);
    return {
      id: r.match_id,
      result: r.result,
      spent: 0,
      cpu_spent: 0,
      missione: null,
      premio: null,
    };
  };

  return (
    <QuickGame
      title={it.scala.titolo}
      load={load}
      play={play}
      senzaMissione
      after={first && <ScalaLadder first={first} />}
    />
  );
}
