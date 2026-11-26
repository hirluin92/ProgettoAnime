import { expect, test } from "vitest";
import { MAX_TOTAL_MS, MIN_TOTAL_MS, totalDuration } from "./schedule";
import type { MatchResult } from "../types/match";

type Ev = MatchResult["eventi"][number];

const stato = { hp: { A: [], B: [] }, energia: { A: [], B: [] }, scudo: { A: [], B: [] } };

function script(turni: number, speciali: number): Ev[] {
  const ev: Ev[] = [{ tipo: "ingresso", stato }];
  for (let t = 1; t <= turni; t++) {
    ev.push({ tipo: "turno", n: t });
    for (let i = 0; i < 14; i++) {
      ev.push({
        tipo: "azione",
        turno: t,
        da: i % 2 ? "A" : "B",
        idx: i % 7,
        mossa: "Attacco",
        speciale: i < speciali,
        effetto: "base",
        esiti: [],
        stato,
      });
    }
  }
  ev.push({ tipo: "fine", vincitore: "A", motivo: "ko" });
  return ev;
}

test("ogni scontro dura tra 20 e 30 secondi a velocità ×1", () => {
  for (const [t, s] of [
    [2, 0],
    [4, 3],
    [6, 5],
    [10, 8],
  ]) {
    const ms = totalDuration(script(t, s));
    expect(ms).toBeGreaterThanOrEqual(MIN_TOTAL_MS - 1);
    expect(ms).toBeLessThanOrEqual(MAX_TOTAL_MS + 1);
  }
});

test("velocità ×2 dimezza la durata", () => {
  const ev = script(5, 3);
  expect(totalDuration(ev, 2)).toBeCloseTo(totalDuration(ev) / 2);
});
