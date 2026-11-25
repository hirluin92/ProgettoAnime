"use client";

import QuickGame, { type Options, type Played } from "@/components/QuickGame";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";

const load = () => api<Options>("/api/quick/options");
const play = (o: Options, ids: string[]) =>
  api<Played>("/api/quick/play", {
    method: "POST",
    body: JSON.stringify({ seed: o.seed, picks: ids }),
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
