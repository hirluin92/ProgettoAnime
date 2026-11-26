"use client";

import QuickGame, { type Played } from "@/components/QuickGame";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { DraftOptions, PickIn } from "@/lib/draft";
import { getProfileId } from "@/lib/profile";

const load = () => api<DraftOptions>("/api/quick/draft");
const play = (
  d: DraftOptions,
  picks: PickIn[],
  swap: string[] | null,
  tattiche: string[],
  carica: string,
  formazione: string,
) =>
  api<Played>("/api/quick/play", {
    method: "POST",
    body: JSON.stringify({
      seed: d.seed,
      picks,
      swap,
      tattiche,
      carica,
      formazione,
      profile_id: getProfileId(),
    }),
  });

export default function Veloce() {
  return (
    <QuickGame
      title={it.veloce.titolo}
      load={load}
      play={play}
      after={
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          {it.veloce.rigioca}
        </button>
      }
    />
  );
}
