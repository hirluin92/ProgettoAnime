import { expect, test } from "vitest";
import { MAX_TOTAL_MS, MIN_TOTAL_MS, totalDuration } from "./schedule";
import type { MatchResult } from "../types/match";

type Ev = MatchResult["eventi"][number];

function script(extraAttacks: number, counters: number, combos: number): Ev[] {
  const ev: Ev[] = [{ tipo: "ingresso" }];
  for (let i = 0; i < 7; i++) {
    ev.push({ tipo: "duello", ruolo: "x", idx: i }, { tipo: "attacco", da: "A", idx: i, danno: 5 });
  }
  for (let i = 0; i < extraAttacks; i++) ev.push({ tipo: "attacco", da: "B", idx: 0, danno: 3 });
  for (let i = 0; i < counters; i++)
    ev.push({ tipo: "counter", da: "A", rel: "a > b", bonus: 8, danno: 5 });
  for (let i = 0; i < combos; i++) {
    ev.push({ tipo: "combo", da: "A", duo: [0, 1], nome: "d", bonus: 12, danno: 5 });
  }
  ev.push({ tipo: "ko", da: "A", danno: 10 });
  return ev;
}

test("ogni scontro dura tra 20 e 30 secondi a velocità ×1", () => {
  for (const [a, c, d] of [
    [0, 0, 0],
    [3, 2, 2],
    [7, 4, 4],
    [12, 4, 4],
  ]) {
    const ms = totalDuration(script(a, c, d));
    expect(ms).toBeGreaterThanOrEqual(MIN_TOTAL_MS - 1);
    expect(ms).toBeLessThanOrEqual(MAX_TOTAL_MS + 1);
  }
});

test("velocità ×2 dimezza la durata", () => {
  const ev = script(3, 2, 2);
  expect(totalDuration(ev, 2)).toBeCloseTo(totalDuration(ev) / 2);
});
